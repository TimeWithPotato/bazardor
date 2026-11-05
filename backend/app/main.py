"""BazarDor API.

Run:  uvicorn app.main:app --reload
Docs: http://localhost:8000/docs  (Swagger UI)
"""
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from statistics import median

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, SessionLocal, engine, get_db
from .outlier import evaluate, update_trust
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(
    title="BazarDor API",
    description=(
        "Crowd-sourced daily market prices for Dhaka, checked against the "
        "official TCB range. Reports pass through an outlier filter before "
        "they count toward an area's price range."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NOT_FOUND = {404: {"model": schemas.ErrorOut}}


# ---------- helpers ----------

def get_or_404(db: Session, model, obj_id: int, label: str):
    obj = db.get(model, obj_id)
    if obj is None:
        raise HTTPException(status_code=404, detail=f"{label} {obj_id} not found")
    return obj


def latest_official(db: Session, product_id: int) -> models.OfficialPrice | None:
    return (db.query(models.OfficialPrice)
            .filter_by(product_id=product_id)
            .order_by(models.OfficialPrice.recorded_on.desc())
            .first())


def official_out(product: models.Product, off: models.OfficialPrice) -> schemas.OfficialPriceOut:
    return schemas.OfficialPriceOut(
        product_id=product.id, product_name=product.name, unit=product.unit,
        min_price=off.min_price, max_price=off.max_price,
        source=off.source, recorded_on=off.recorded_on,
    )


def submission_out(s: models.PriceSubmission) -> schemas.SubmissionOut:
    return schemas.SubmissionOut(
        id=s.id, product_id=s.product_id, product_name=s.product.name,
        product_name_bn=s.product.name_bn, unit=s.product.unit,
        area_id=s.area_id, area_name=s.area.name, vendor_location=s.vendor_location,
        price=s.price, status=s.status, reason=s.reason,
        reporter=s.user.nickname, created_at=s.created_at,
    )


def accepted_since(db: Session, product_id: int, days: int):
    since = models.utcnow() - timedelta(days=days)
    return (db.query(models.PriceSubmission)
            .filter(models.PriceSubmission.product_id == product_id,
                    models.PriceSubmission.status == "accepted",
                    models.PriceSubmission.created_at >= since)
            .all())


def pct_vs_official(value: float, off: models.OfficialPrice | None) -> float | None:
    if off is None:
        return None
    mid = (off.min_price + off.max_price) / 2
    return round((value - mid) / mid * 100, 1)


# ---------- users ----------

@app.post("/api/users", response_model=schemas.UserOut, status_code=201, tags=["Users"],
          summary="Create a reporter profile")
def create_user(body: schemas.UserCreate, db: Session = Depends(get_db)):
    user = models.User(nickname=body.nickname)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users/{user_id}", response_model=schemas.UserOut, tags=["Users"], responses=NOT_FOUND)
def get_user(user_id: int, db: Session = Depends(get_db)):
    return get_or_404(db, models.User, user_id, "User")


# ---------- catalog ----------

@app.get("/api/products", response_model=list[schemas.ProductOut], tags=["Catalog"])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id).all()


@app.get("/api/areas", response_model=list[schemas.AreaOut], tags=["Catalog"])
def list_areas(db: Session = Depends(get_db)):
    return db.query(models.Area).order_by(models.Area.name).all()


@app.get("/api/products/standard-price", response_model=schemas.OfficialPriceOut,
         tags=["Catalog"], responses=NOT_FOUND,
         summary="Official (TCB) price range for a product")
def standard_price(product_id: int = Query(gt=0), db: Session = Depends(get_db)):
    product = get_or_404(db, models.Product, product_id, "Product")
    off = latest_official(db, product_id)
    if off is None:
        raise HTTPException(404, f"No official price recorded for product {product_id}")
    return official_out(product, off)


# ---------- prices ----------

@app.post("/api/prices/submit", response_model=schemas.SubmitResult, status_code=201,
          tags=["Prices"], responses=NOT_FOUND,
          summary="Report a price you saw today")
def submit_price(body: schemas.PriceSubmit, db: Session = Depends(get_db)):
    """Runs the outlier filter, stores the report with its verdict, and
    updates the reporter's trust score. Flagged and rejected reports are
    saved (for transparency) but never count toward price ranges."""
    user = get_or_404(db, models.User, body.user_id, "User")
    product = get_or_404(db, models.Product, body.product_id, "Product")
    area = get_or_404(db, models.Area, body.area_id, "Area")

    off = latest_official(db, product.id)
    recent = [s.price for s in accepted_since(db, product.id, 7)]
    verdict = evaluate(body.price,
                       off.min_price if off else None,
                       off.max_price if off else None,
                       recent, user.trust_score)

    sub = models.PriceSubmission(
        user_id=user.id, product_id=product.id, area_id=area.id,
        vendor_location=body.vendor_location, price=body.price,
        status=verdict.status, reason=verdict.reason,
    )
    user.trust_score = update_trust(user.trust_score, verdict.status)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return schemas.SubmitResult(submission=submission_out(sub), z_score=verdict.z_score,
                                trust_score=user.trust_score)


@app.get("/api/prices/feed", response_model=schemas.PriceFeed, tags=["Prices"],
         responses=NOT_FOUND, summary="Price range per area, cheapest first")
def price_feed(product_id: int = Query(gt=0), days: int = Query(7, ge=1, le=30),
               db: Session = Depends(get_db)):
    """The core feature: for one product, group accepted reports by area and
    return min / median / max, sorted so the cheapest area comes first."""
    product = get_or_404(db, models.Product, product_id, "Product")
    off = latest_official(db, product_id)

    by_area: dict[int, list[models.PriceSubmission]] = {}
    for s in accepted_since(db, product_id, days):
        by_area.setdefault(s.area_id, []).append(s)

    rows = []
    for subs in by_area.values():
        prices = [s.price for s in subs]
        med = median(prices)
        a = subs[0].area
        rows.append(schemas.AreaRange(
            area_id=a.id, area_name=a.name, area_name_bn=a.name_bn,
            min_price=min(prices), max_price=max(prices), median_price=med,
            reports=len(prices), last_reported=max(s.created_at for s in subs),
            vs_official_pct=pct_vs_official(med, off),
        ))
    rows.sort(key=lambda r: r.median_price)

    return schemas.PriceFeed(
        product=schemas.ProductOut.model_validate(product),
        official=official_out(product, off) if off else None,
        days=days,
        cheapest_area_id=rows[0].area_id if rows else None,
        areas=rows,
    )


@app.get("/api/prices/recent", response_model=list[schemas.SubmissionOut], tags=["Prices"],
         summary="Latest reports, including flagged and rejected ones")
def recent_reports(status: str | None = Query(None, pattern="^(accepted|flagged|rejected)$"),
                   product_id: int | None = Query(None, gt=0),
                   limit: int = Query(30, ge=1, le=100),
                   db: Session = Depends(get_db)):
    q = db.query(models.PriceSubmission)
    if status:
        q = q.filter(models.PriceSubmission.status == status)
    if product_id:
        q = q.filter(models.PriceSubmission.product_id == product_id)
    subs = q.order_by(models.PriceSubmission.created_at.desc()).limit(limit).all()
    return [submission_out(s) for s in subs]


@app.get("/api/prices/trend", response_model=list[schemas.TrendPoint], tags=["Prices"],
         responses=NOT_FOUND, summary="Daily median price across Dhaka")
def price_trend(product_id: int = Query(gt=0), days: int = Query(7, ge=2, le=30),
                db: Session = Depends(get_db)):
    get_or_404(db, models.Product, product_id, "Product")
    today = models.utcnow().date()
    buckets: dict[str, list[float]] = {
        (today - timedelta(days=i)).isoformat(): [] for i in range(days - 1, -1, -1)
    }
    for s in accepted_since(db, product_id, days):
        key = s.created_at.date().isoformat()
        if key in buckets:
            buckets[key].append(s.price)
    return [schemas.TrendPoint(date=d, median_price=median(v) if v else None, reports=len(v))
            for d, v in buckets.items()]


@app.get("/api/market/overview", response_model=list[schemas.OverviewRow], tags=["Prices"],
         summary="Every product: official range vs. what people actually pay")
def market_overview(db: Session = Depends(get_db)):
    out = []
    for p in db.query(models.Product).order_by(models.Product.id).all():
        off = latest_official(db, p.id)
        subs = accepted_since(db, p.id, 7)
        med = median([s.price for s in subs]) if subs else None
        cheapest = None
        if subs:
            per_area: dict[str, list[float]] = {}
            for s in subs:
                per_area.setdefault(s.area.name, []).append(s.price)
            cheapest = min(per_area, key=lambda k: median(per_area[k]))
        out.append(schemas.OverviewRow(
            product=schemas.ProductOut.model_validate(p),
            official_min=off.min_price if off else None,
            official_max=off.max_price if off else None,
            community_median=med,
            vs_official_pct=pct_vs_official(med, off) if med is not None else None,
            cheapest_area=cheapest, reports=len(subs),
        ))
    return out


@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok"}


# ---------- serve the built React app (single deploy) ----------

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        file = DIST / path
        if path and file.is_file():
            return FileResponse(file)
        return FileResponse(DIST / "index.html")
