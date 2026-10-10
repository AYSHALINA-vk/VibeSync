# backend/matching.py
# Pure functions: no database calls, so they are easy to test.
from datetime import date

from vibe_codes import (
    BUDGET_LABEL, BUDGET_SCALE, INTEREST_LABEL, PACE_PHRASE, PACE_SCALE, PREF_KEYS, SOCIAL_SCALE,
)

MIN_OVERLAP_DAYS = 2

# Weights add up to 100
WEIGHTS = {
    "budget": 25, "pace": 25,                          # 50: how you travel
    "landscape": 10, "social": 10, "interests": 10,    # 30: what and who you enjoy
    "prefs": 10, "group": 10,                          # 20: practical fit
}


def overlap_days(a_start, a_end, b_start, b_end):
    start, end = max(a_start, b_start), min(a_end, b_end)
    return max(0, (end - start).days + 1)  # inclusive of both end days


def scale_closeness(scale, a, b):
    """1.0 = same, 0.0 = opposite ends. Missing or neutral codes give 0.5."""
    if a and a == b:
        return 1.0
    if a not in scale or b not in scale:
        return 0.5
    span = max(scale.values()) - min(scale.values())
    return 1 - abs(scale[a] - scale[b]) / span


def landscape_score(a, b):
    if not a or not b:
        return 0.5
    if a == b:
        return 1.0
    if "both" in (a, b) and ({a, b} - {"both"}) <= {"mountains", "beaches"}:
        return 0.75
    return 0.0


def interest_score(a, b):
    a, b = set(a or []), set(b or [])
    if not a or not b:
        return 0.0, []
    shared = sorted(a & b)
    return len(shared) / min(len(a), len(b)), shared


def prefs_score(pa, pb):
    """Compare only the optional prefs both people answered (and not 'flexible')."""
    pa, pb = pa or {}, pb or {}
    comparable = matched = 0
    for k in PREF_KEYS:
        x, y = pa.get(k), pb.get(k)
        if not x or not y or "flexible" in (x, y):
            continue
        comparable += 1
        matched += x == y
    return 0.5 if comparable == 0 else matched / comparable


def group_score(a, b):
    try:
        return 1 - min(abs(int(a) - int(b)), 6) / 6
    except (TypeError, ValueError):
        return 0.5


def score_match(me, other, my_trip, other_trip):
    """Return None if the gate fails, else {score, reasons, overlap_days, trip}."""
    # ---- gate ----
    if my_trip["destination"].strip().lower() != other_trip["destination"].strip().lower():
        return None
    days = overlap_days(
        date.fromisoformat(my_trip["start_date"]), date.fromisoformat(my_trip["end_date"]),
        date.fromisoformat(other_trip["start_date"]), date.fromisoformat(other_trip["end_date"]),
    )
    if days < MIN_OVERLAP_DAYS:
        return None

    # ---- score ----
    my_x, ot_x = me.get("extras") or {}, other.get("extras") or {}
    i_score, shared = interest_score(me.get("interests"), other.get("interests"))
    parts = {
        "budget": scale_closeness(BUDGET_SCALE, me.get("budget_style"), other.get("budget_style")),
        "pace": scale_closeness(PACE_SCALE, me.get("pace"), other.get("pace")),
        "landscape": landscape_score(me.get("landscape"), other.get("landscape")),
        "social": scale_closeness(SOCIAL_SCALE, me.get("social_energy"), other.get("social_energy")),
        "interests": i_score,
        "prefs": prefs_score(my_x.get("prefs"), ot_x.get("prefs")),
        "group": group_score(me.get("group_size_pref"), other.get("group_size_pref")),
    }
    total = sum(WEIGHTS[k] * v for k, v in parts.items())

    # ---- why you match ----
    reasons = [f"{days} overlapping days"]
    if me.get("pace") and me.get("pace") == other.get("pace"):
        reasons.append(f"Both {PACE_PHRASE.get(me['pace'], 'similar pace')}")
    if me.get("budget_style") and me.get("budget_style") == other.get("budget_style") and me["budget_style"] != "varies":
        reasons.append(f"Same budget style: {BUDGET_LABEL.get(me['budget_style'], me['budget_style'])}")
    if shared:
        names = [INTEREST_LABEL.get(s, s) for s in shared[:3]]
        reasons.append(f"{len(shared)} shared interest{'s' if len(shared) > 1 else ''}: {', '.join(names)}")
    if me.get("social_energy") and me.get("social_energy") == other.get("social_energy") and me["social_energy"] != "unsure":
        reasons.append("Same social energy")
    if me.get("landscape") and me.get("landscape") == other.get("landscape"):
        reasons.append(f"Both love {me['landscape']}")

    return {"score": round(total), "reasons": reasons, "overlap_days": days, "trip": other_trip}