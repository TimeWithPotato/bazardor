import os
import tempfile

# Use a throwaway database for tests
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.outlier import evaluate, modified_z_score  # noqa: E402


def client():
    return TestClient(app)


def test_z_score_needs_enough_samples():
    assert modified_z_score(50, [50, 51]) is None


def test_outlier_rules():
    recent = [56, 57, 57, 58, 58, 59, 60]
    assert evaluate(57, 54, 60, recent, 50).status == "accepted"
    assert evaluate(20, 54, 60, recent, 50).status == "rejected"   # < half official min
    assert evaluate(200, 54, 60, recent, 50).status == "rejected"  # > 2x official max
    assert evaluate(80, 54, 60, recent, 50).status == "flagged"    # community outlier
    assert evaluate(57, 54, 60, recent, 10).status == "flagged"    # low trust


def test_full_flow():
    with client() as c:
        products = c.get("/api/products").json()
        areas = c.get("/api/areas").json()
        assert len(products) > 5 and len(areas) > 5

        user = c.post("/api/users", json={"nickname": "Tester"}).json()
        pid, aid = products[0]["id"], areas[0]["id"]

        off = c.get("/api/products/standard-price", params={"product_id": pid}).json()
        good = (off["min_price"] + off["max_price"]) / 2

        r = c.post("/api/prices/submit", json={
            "user_id": user["id"], "product_id": pid, "area_id": aid, "price": good})
        assert r.status_code == 201
        assert r.json()["submission"]["status"] == "accepted"

        r = c.post("/api/prices/submit", json={
            "user_id": user["id"], "product_id": pid, "area_id": aid, "price": 1})
        assert r.json()["submission"]["status"] == "rejected"

        feed = c.get("/api/prices/feed", params={"product_id": pid}).json()
        medians = [a["median_price"] for a in feed["areas"]]
        assert medians == sorted(medians)
        assert feed["cheapest_area_id"] == feed["areas"][0]["area_id"]


def test_validation_errors():
    with client() as c:
        assert c.post("/api/prices/submit", json={
            "user_id": 1, "product_id": 1, "area_id": 1, "price": -5}).status_code == 422
        assert c.post("/api/prices/submit", json={
            "user_id": 9999, "product_id": 1, "area_id": 1, "price": 50}).status_code == 404
        assert c.post("/api/users", json={"nickname": " "}).status_code == 422
        assert c.get("/api/prices/feed", params={"product_id": 999}).status_code == 404
