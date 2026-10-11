"""
Create confirmed test travelers WITHOUT sending any email (so no rate limit).
Run from the backend folder, with the venv active:   python create_test_users.py
Uses the service key from backend/.env. It is safe to run again: existing users are reused.
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

PASSWORD = "Test@12345"   # test accounts only. Change it if you like (6+ characters)
DESTINATION = "Munnar"
START, END = "2026-10-25", "2026-10-31"

# email, display name, home city, pace, budget style, social energy, interests
USERS = [
    ("shree@gmail.com", "Shree", "Kochi", "slow", "comfort_budget", "small", ["hiking", "photography", "nature"]),
    ("laya@gmail.com", "Laya", "Thrissur", "mixed", "budget", "both", ["photography", "food", "roadtrips"]),
    ("meera@gmail.com", "Meera", "Kottayam", "slow", "comfort_budget", "small", ["hiking", "books", "nature"]),
        ("akash123@gmail.com", "Akash", "Kochi", "slow", "budget", "small", ["hiking", "camping"]),
]


def user_id_for(email: str) -> str:
    try:
        res = sb.auth.admin.create_user({"email": email, "password": PASSWORD, "email_confirm": True})
        print(f"created   {email}")
        return res.user.id
    except Exception as e:
        if "already" not in str(e).lower():
            raise
        for u in sb.auth.admin.list_users(page=1, per_page=200):
            if (u.email or "").lower() == email.lower():
                print(f"exists    {email}")
                return u.id
        raise RuntimeError(f"{email} exists but was not found in the first 200 users")


for email, name, city, pace, budget, energy, interests in USERS:
    uid = user_id_for(email)
    sb.table("profiles").upsert({
        "id": uid, "display_name": name, "home_city": city, "pace": pace,
        "budget_style": budget, "social_energy": energy, "interests": interests,
    }).execute()
    if not sb.table("trips").select("id").eq("user_id", uid).limit(1).execute().data:
        sb.table("trips").insert({"user_id": uid, "destination": DESTINATION, "start_date": START, "end_date": END}).execute()

print(f"\nDone. Log in with any of these emails and the password {PASSWORD!r}.")