# backend/vibe_codes.py
# Mirror of frontend/src/lib/vibeOptions.js. The codes must stay identical.

# Ordered scales: closeness = 1 - distance / span. Codes not listed are neutral.
BUDGET_SCALE = {"budget": 1, "comfort_budget": 2, "comfort": 3, "luxury": 4}  # "varies" is neutral
SOCIAL_SCALE = {"quiet": 1, "small": 2, "both": 3, "social": 4}               # "unsure" is neutral
PACE_SCALE = {"slow": 1, "mixed": 2, "packed": 3}                             # "flow" is neutral

PREF_KEYS = ["stay", "transport", "wake", "planning", "expenses"]

PACE_PHRASE = {
    "slow": "slow travelers", "mixed": "balanced travelers",
    "packed": "adventure-packed travelers", "flow": "go-with-the-flow travelers",
}
BUDGET_LABEL = {
    "budget": "Budget-friendly", "comfort_budget": "Comfort on a budget",
    "comfort": "Comfort-first", "luxury": "Luxury", "varies": "Flexible",
}
INTEREST_LABEL = {
    "hiking": "Hiking & trekking", "beaches": "Beaches & swimming", "photography": "Photography",
    "food": "Local food & cafés", "nature": "Nature & wildlife", "camping": "Camping",
    "culture": "Culture & history", "music": "Music & festivals", "art": "Art & architecture",
    "roadtrips": "Road trips", "cafes": "Café hopping", "books": "Books & quiet spots",
    "markets": "Shopping & markets", "stargazing": "Stargazing", "gaming": "Gaming & pop culture",
    "adventure": "Outdoor adventure",
}