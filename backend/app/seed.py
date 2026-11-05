"""Fills an empty database with demo data.

Official ranges are SAMPLE values modelled on TCB's daily Dhaka market price
list as reported in the news in 2025-2026. They are for the demo only. A real
version would fetch the TCB list every day (see README, "Next steps").

Community reports are generated: each area gets a small price "personality"
(Karwan Bazar is a wholesale hub, so cheaper; Gulshan is pricier), plus noise,
plus a few deliberately fake reports so the outlier filter has something to catch.
"""
import random
from datetime import timedelta

from sqlalchemy.orm import Session

from . import models
from .outlier import evaluate, update_trust

# name, Bangla name, category, unit, official min, official max
PRODUCTS = [
    ("Coarse rice", "মোটা চাল", "Rice", "kg", 54, 60),
    ("Medium rice", "মাঝারি চাল", "Rice", "kg", 60, 66),
    ("Fine rice (Miniket)", "সরু চাল (মিনিকেট)", "Rice", "kg", 72, 80),
    ("Lentil (coarse)", "মসুর ডাল (মোটা)", "Lentils", "kg", 105, 115),
    ("Lentil (fine)", "মসুর ডাল (সরু)", "Lentils", "kg", 135, 150),
    ("Soybean oil (loose)", "সয়াবিন তেল (খোলা)", "Oil", "litre", 175, 185),
    ("Soybean oil (bottled)", "সয়াবিন তেল (বোতল)", "Oil", "litre", 189, 195),
    ("Onion (local)", "দেশি পেঁয়াজ", "Vegetables", "kg", 40, 55),
    ("Potato", "আলু", "Vegetables", "kg", 20, 28),
    ("Green chilli", "কাঁচা মরিচ", "Vegetables", "kg", 60, 80),
    ("Sugar", "চিনি", "Grocery", "kg", 110, 120),
    ("Egg (farm)", "ডিম (ফার্ম)", "Protein", "dozen", 115, 125),
    ("Broiler chicken", "ব্রয়লার মুরগি", "Protein", "kg", 190, 210),
]

# name, Bangla name, price multiplier vs. official midpoint
AREAS = [
    ("Karwan Bazar", "কারওয়ান বাজার", 0.94),
    ("Jatrabari", "যাত্রাবাড়ী", 0.96),
    ("Mirpur", "মিরপুর", 0.99),
    ("Mohammadpur", "মোহাম্মদপুর", 0.98),
    ("Old Dhaka", "পুরান ঢাকা", 0.97),
    ("Badda", "বাড্ডা", 1.01),
    ("Uttara", "উত্তরা", 1.04),
    ("Dhanmondi", "ধানমন্ডি", 1.06),
    ("Gulshan", "গুলশান", 1.13),
]

USERS = ["Rafi", "Nusrat", "Tanvir", "Sadia", "Imran", "Farhana", "Arif", "Mitu"]


def refresh_demo_dates(db: Session) -> None:
    """Price ranges only use the last 7 days. If the server restarts weeks
    later, slide all demo reports forward so the newest one is "now" and the
    demo never shows empty charts."""
    from sqlalchemy import func
    newest = db.query(func.max(models.PriceSubmission.created_at)).scalar()
    if newest is None:
        return
    gap = models.utcnow() - newest
    if gap > timedelta(hours=12):
        for s in db.query(models.PriceSubmission).all():
            s.created_at += gap
        db.commit()


def seed(db: Session, rng_seed: int = 42) -> None:
    if db.query(models.Product).first():
        refresh_demo_dates(db)
        return  # already seeded

    rng = random.Random(rng_seed)
    now = models.utcnow()

    products = []
    for name, bn, cat, unit, lo, hi in PRODUCTS:
        p = models.Product(name=name, name_bn=bn, category=cat, unit=unit)
        p.official_prices.append(models.OfficialPrice(min_price=lo, max_price=hi, recorded_on=now))
        db.add(p)
        products.append((p, lo, hi))

    areas = []
    for name, bn, mult in AREAS:
        a = models.Area(name=name, name_bn=bn)
        db.add(a)
        areas.append((a, mult))

    users = [models.User(nickname=n) for n in USERS]
    spammer = models.User(nickname="cheap_deals_99")
    db.add_all(users + [spammer])
    db.flush()

    events = []
    for p, lo, hi in products:
        mid = (lo + hi) / 2
        for a, mult in areas:
            for _ in range(rng.randint(3, 6)):
                price = mid * mult * rng.uniform(0.95, 1.05)
                when = now - timedelta(days=rng.uniform(0, 6.9))
                events.append((when, p, a, rng.choice(users), round(price)))
        # fake or typo reports: suspicious (flagged) and impossible (rejected)
        for factor in (1.6, 0.4, 2.6):
            events.append((now - timedelta(days=rng.uniform(0, 3)), p, rng.choice(areas)[0],
                           spammer, round(mid * factor)))

    events.sort(key=lambda e: e[0])
    recent: dict[int, list[float]] = {}
    markets = ["kacha bazar", "super shop", "street vendor", "wholesale lane", ""]
    for when, p, a, u, price in events:
        lo, hi = next((l, h) for prod, l, h in products if prod is p)
        verdict = evaluate(price, lo, hi, recent.get(p.id, []), u.trust_score)
        u.trust_score = update_trust(u.trust_score, verdict.status)
        if verdict.status == "accepted":
            recent.setdefault(p.id, []).append(price)
        m = rng.choice(markets)
        db.add(models.PriceSubmission(
            user_id=u.id, product_id=p.id, area_id=a.id, price=price,
            vendor_location=f"{a.name} {m}".strip() if m else None,
            status=verdict.status, reason=verdict.reason, created_at=when,
        ))
    db.commit()
