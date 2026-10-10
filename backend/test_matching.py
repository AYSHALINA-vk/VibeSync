# backend/test_matching.py
from matching import score_match

me = {"pace": "slow", "budget_style": "comfort_budget", "social_energy": "small", "landscape": "mountains",
      "interests": ["hiking", "photography", "food"], "group_size_pref": 4,
      "extras": {"prefs": {"stay": "homestay"}}}
other = {"pace": "slow", "budget_style": "comfort", "social_energy": "both", "landscape": "both",
         "interests": ["hiking", "food", "music"], "group_size_pref": 3,
         "extras": {"prefs": {"stay": "homestay"}}}

my_trip = {"destination": "Munnar", "start_date": "2026-11-10", "end_date": "2026-11-14"}

good = score_match(me, other, my_trip, {"destination": "munnar ", "start_date": "2026-11-12", "end_date": "2026-11-16"})
print(good)
assert good and good["score"] == 81 and good["overlap_days"] == 3

# wrong destination -> excluded
assert score_match(me, other, my_trip, {"destination": "Goa", "start_date": "2026-11-12", "end_date": "2026-11-16"}) is None
# only 1 overlapping day -> excluded
assert score_match(me, other, my_trip, {"destination": "Munnar", "start_date": "2026-11-14", "end_date": "2026-11-20"}) is None
print("All matching tests passed")