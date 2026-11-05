"""Outlier filter: decides if a reported price is accepted, flagged or rejected.

Three checks, cheapest first:

1. Official sanity bound
   A price less than half the official minimum, or more than double the
   official maximum, is almost certainly a typo or a fake -> REJECTED.

2. Community check (modified z-score, Iglewicz & Hoaglin)
   Compare the price with what other people reported for the same product
   in the last 7 days. We use the median and MAD (median absolute deviation)
   instead of mean/std because one fake report can drag a mean around, but
   barely moves a median.

       z = 0.6745 * (price - median) / MAD

   |z| > 3.5 is the textbook outlier cut-off -> FLAGGED (kept, but hidden
   from the price ranges until reviewed).

3. Trust score
   Reports from users with a very low trust score are FLAGGED even if the
   price looks normal, so a known bad actor can't slowly poison the data.
"""
from dataclasses import dataclass
from statistics import median

MIN_SAMPLES = 5          # need this many recent reports before the z-score is meaningful
Z_THRESHOLD = 3.5
LOW_TRUST = 20
MAD_FLOOR_RATIO = 0.05   # stops MAD from being ~0 when everyone reports the same price;
                         # with 5%, a price must be ~25%+ away from the median to be flagged


@dataclass
class Verdict:
    status: str          # accepted | flagged | rejected
    reason: str
    z_score: float | None = None


def modified_z_score(price: float, recent: list[float]) -> float | None:
    if len(recent) < MIN_SAMPLES:
        return None
    med = median(recent)
    mad = median(abs(p - med) for p in recent)
    mad = max(mad, med * MAD_FLOOR_RATIO)
    return 0.6745 * (price - med) / mad


def evaluate(price: float, official_min: float | None, official_max: float | None,
             recent_accepted: list[float], trust_score: int) -> Verdict:
    # 1. Sanity bound against the official range
    if official_min is not None and official_max is not None:
        if price < official_min * 0.5:
            return Verdict("rejected", f"Less than half the official minimum (Tk {official_min:g})")
        if price > official_max * 2:
            return Verdict("rejected", f"More than double the official maximum (Tk {official_max:g})")

    # 2. Community check
    z = modified_z_score(price, recent_accepted)
    if z is not None and abs(z) > Z_THRESHOLD:
        direction = "higher" if z > 0 else "lower"
        return Verdict("flagged", f"Much {direction} than other reports this week", round(z, 2))

    # 3. Trust score
    if trust_score < LOW_TRUST:
        return Verdict("flagged", "Held for review: reporter has a low trust score",
                       round(z, 2) if z is not None else None)

    # Passed every check
    if official_min is not None and official_max is not None:
        if price > official_max:
            reason = "Accepted. Above the official range"
        elif price < official_min:
            reason = "Accepted. Below the official range"
        else:
            reason = "Accepted. Within the official range"
    else:
        reason = "Accepted"
    return Verdict("accepted", reason, round(z, 2) if z is not None else None)


TRUST_DELTA = {"accepted": 1, "flagged": -5, "rejected": -10}


def update_trust(score: int, status: str) -> int:
    return max(0, min(100, score + TRUST_DELTA[status]))
