# backend/main.py
import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client

from matching import score_match

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

BLOCKER_COL = "blocker_id"   # check these two against the blocks table
BLOCKED_COL = "blocked_id"

app = FastAPI(title="VibeTrip API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Only these profile fields are ever returned. No email, phone, or documents.
PUBLIC_FIELDS = ["id", "display_name", "age", "home_city", "bio", "avatar_url", "personality_tags",
                 "pace", "budget_style", "social_energy", "interests",
                 "email_verified", "phone_verified", "identity_verified", "trip_verified"]


def current_user_id(authorization: Optional[str]) -> str:
    """Verify the Supabase login token and return who is calling."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing login token")
    try:
        return sb.auth.get_user(authorization.split(" ", 1)[1]).user.id
    except Exception:
        raise HTTPException(401, "Invalid or expired token")


@app.get("/")
def root():
    return {"status": "VibeTrip API running"}


@app.get("/matches/{user_id}")
def matches(user_id: str, authorization: Optional[str] = Header(default=None)):
    if current_user_id(authorization) != user_id:
        raise HTTPException(403, "You can only view your own matches")

    rows = sb.table("profiles").select("*").eq("id", user_id).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Finish onboarding first")
    me = rows[0]

    my_trips = sb.table("trips").select("*").eq("user_id", user_id).order("start_date", desc=True).limit(1).execute().data
    if not my_trips:
        return {"trip": None, "matches": []}
    my_trip = my_trips[0]

    # users blocked in either direction are excluded
    block_rows = (sb.table("blocks").select(f"{BLOCKER_COL},{BLOCKED_COL}")
                  .or_(f"{BLOCKER_COL}.eq.{user_id},{BLOCKED_COL}.eq.{user_id}").execute().data)
    blocked = {r[BLOCKER_COL] for r in block_rows} | {r[BLOCKED_COL] for r in block_rows}
    blocked.discard(user_id)

    # MVP scale: fetch other trips and filter in Python
    other_trips = [t for t in sb.table("trips").select("*").neq("user_id", user_id).execute().data
                   if t["user_id"] not in blocked]
    if not other_trips:
        return {"trip": my_trip, "matches": []}

    ids = list({t["user_id"] for t in other_trips})
    profiles = {p["id"]: p for p in sb.table("profiles").select("*").in_("id", ids).execute().data
                if not p.get("hidden")}

    best = {}  # one result per person (their best-scoring trip)
    for t in other_trips:
        other = profiles.get(t["user_id"])
        if not other:
            continue
        res = score_match(me, other, my_trip, t)
        if res and (t["user_id"] not in best or res["score"] > best[t["user_id"]]["score"]):
            res["profile"] = {k: other.get(k) for k in PUBLIC_FIELDS}
            best[t["user_id"]] = res

    ranked = sorted(best.values(), key=lambda r: (-r["score"], -r["overlap_days"]))
    return {"trip": my_trip, "matches": ranked}