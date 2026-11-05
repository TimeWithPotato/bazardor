# BazarDor (বাজার দর)

**Where is it cheapest in Dhaka today?**

BazarDor is a crowd-sourced price tracker for daily goods in Dhaka. Shoppers report the prices they see in their area. The system filters out fake or mistyped reports, then shows the price range in each area next to the official TCB (Trading Corporation of Bangladesh) rate. That way buyers can see which area is cheapest before they go to the market.

- **Live demo:** https://bazardor-kszf.onrender.com
- **API docs (Swagger UI):** https://bazardor-kszf.onrender.com/docs

> The app runs on Render's free plan. If it has been idle, the first load can take 30–60 seconds while the server wakes up.

This is my Phase 02 submission for the Credosis Internship Program (**Frontend track**).

---

## The problem

Recent fuel price hikes in Bangladesh pushed up the cost of public transport, trucking and irrigation, and grocery prices followed. Lower- and middle-income families and daily commuters are hit hardest.

Prices for the same item can also differ a lot between markets. I've noticed there's no easy, real-time way to compare them, so I usually end up going from shop to shop to find the actual price.

## My solution

Shoppers report prices, and the system checks each report before trusting it. The app then compares what people actually pay with the official rate, area by area.

### Features

| Feature | What it does |
|---|---|
| **Compare areas** (core) | Pick an item and see every area's price range on one scale, cheapest first. The official TCB range shows as a shaded band, so you can see straight away which areas charge more. A "Best place to buy" card shows the cheapest area and how much you save. |
| **Report a price** | Enter a nickname, then choose the item, area and price. You get an instant result (accepted, flagged or rejected) with the reason. |
| **Live reports** | Every report appears here, including the ones the filter held back and why. |
| **All items** | One table of every item: official rate, what people actually pay, and the cheapest area. |

The layout is responsive and works on mobile, where the navigation moves to a bottom tab bar.

### How the outlier filter works

Each report goes through three checks (`backend/app/outlier.py`):

1. **Official bound:** a price below half the official minimum, or above double the official maximum, is **rejected**. These are usually typos or obvious fakes.
2. **Community check:** the price is compared with the last 7 days of accepted reports using a **modified z-score**, which is based on the median and MAD instead of the mean. A single fake price can't shift the median much. If the score is above 3.5, the report is **flagged** and doesn't count toward the ranges.
3. **Trust score:** every user starts at 50. Accepted reports raise the score, and flagged or rejected ones lower it. Once a user drops below 20, all their new reports are flagged for review.

Only accepted reports are used to calculate the area price ranges.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS, React Router
- **Backend:** FastAPI, SQLAlchemy, SQLite
- **Deployment:** Render. FastAPI also serves the built React app, so everything runs from one link.

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/prices/submit` | Submit a price report (runs the outlier filter) |
| GET | `/api/prices/feed?product_id=` | Price range per area, cheapest first |
| GET | `/api/products/standard-price?product_id=` | Official TCB price range |
| GET | `/api/prices/recent` | Latest reports with their status |
| GET | `/api/market/overview` | Official vs. community price for every item |

The full list is in the [Swagger docs](https://bazardor-kszf.onrender.com/docs).

## Data tables

- `users`: id, nickname, role, trust_score
- `products`: id, name, name_bn, category, unit
- `areas`: id, name, name_bn
- `official_prices`: product_id, min_price, max_price, source, recorded_on
- `price_submissions`: user_id, product_id, area_id, vendor_location, price, status, reason, created_at

## Run it locally

Requires Python 3.10+ and Node 18+.

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate            # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload    # http://localhost:8000/docs

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

The database is created and filled with demo data the first time the backend starts. To reset it, delete `backend/bazardor.db`.

Run the tests with `cd backend && pytest`.

## Limitations

- **The official TCB prices are sample data.** They're based on TCB's Dhaka market price list as reported in the news, and the community reports are generated for the demo.
- There is no real login yet, only a nickname, so creating fake accounts is easy.
- Only 9 Dhaka areas are included.
- The community check needs at least 5 recent reports for an item before it can judge a new price.

## Next steps

- A daily scraper for TCB's official price list
- Phone OTP login, and giving more weight to reports from high-trust users
- An offline-first mobile version, so reports can be saved without internet and synced later
- Nearby markets based on GPS, plus price-drop alerts
- Moving from SQLite to PostgreSQL

## How I built it

I used AI tools (Claude) to speed up development. I reviewed the code, tested it and made changes myself. I'm happy to walk through any part of it.
