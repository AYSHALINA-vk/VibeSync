// frontend/src/lib/vibeOptions.js
// value = what is stored in the database (never change these once users exist)
// label/hint = what the user sees (safe to reword anytime)

const u = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

export const PACE = [
  { value: 'slow',   icon: '🏝️', label: 'Slow & relaxed',      hint: 'Fewer places, more time to enjoy them',
    img: u('photo-1507525428034-b723cf961d3e'), fb: 'linear-gradient(160deg,#0f6b7a,#0a1c33)' },
  { value: 'mixed',  icon: '🌿', label: 'A bit of everything', hint: 'Sightseeing with room to relax',
    img: u('photo-1501785888041-af3ef285b470'), fb: 'linear-gradient(160deg,#2f6b3f,#0c1f17)' },
  { value: 'packed', icon: '🥾', label: 'Adventure-packed',    hint: 'Activities, trails, and new experiences',
    img: u('photo-1464822759023-fed622ff2c3b'), fb: 'linear-gradient(160deg,#27425a,#0c1f17)' },
  { value: 'flow',   icon: '✨', label: 'Go with the flow',    hint: 'Decide as the journey unfolds',
    img: u('photo-1488646953014-85cb44e25828'), fb: 'linear-gradient(160deg,#5a4a2a,#0a1c33)' },
];

export const BUDGET_STYLE = [
  { value: 'budget',         icon: '🎒', label: 'Budget-friendly',     hint: 'Hostels, public transport, local food' },
  { value: 'comfort_budget', icon: '🏡', label: 'Comfort on a budget', hint: 'Affordable stays with a few splurges' },
  { value: 'comfort',        icon: '🛏️', label: 'Comfort-first',       hint: 'Convenient stays and hassle-free travel' },
  { value: 'luxury',         icon: '👑', label: 'Luxury experiences',  hint: 'Premium stays and special experiences' },
  { value: 'varies',         icon: '🗺️', label: 'Depends on the trip', hint: 'Budget changes with the destination' },
];

export const SOCIAL_ENERGY = [
  { value: 'quiet',  icon: '🌱', label: 'Quiet & independent',       hint: 'Comfortable with solo exploring' },
  { value: 'small',  icon: '👥', label: 'Small-group person',        hint: 'A few people and meaningful conversations' },
  { value: 'both',   icon: '☯️', label: 'A mix of both',             hint: 'Social sometimes, alone sometimes' },
  { value: 'social', icon: '🥳', label: 'Always up for company',     hint: 'Meeting people and doing things together' },
  { value: 'unsure', icon: '💬', label: "Let's see how we connect",  hint: 'Decide naturally after meeting' },
];

export const INTERESTS = [
  { value: 'hiking',      label: 'Hiking & trekking',      icon: '🏔️' },
  { value: 'beaches',     label: 'Beaches & swimming',     icon: '🌊' },
  { value: 'photography', label: 'Photography',            icon: '📸' },
  { value: 'food',        label: 'Local food & cafés',     icon: '🍜' },
  { value: 'nature',      label: 'Nature & wildlife',      icon: '🌲' },
  { value: 'camping',     label: 'Camping',                icon: '🏕️' },
  { value: 'culture',     label: 'Culture & history',      icon: '🏛️' },
  { value: 'music',       label: 'Music & festivals',      icon: '🎶' },
  { value: 'art',         label: 'Art & architecture',     icon: '🎨' },
  { value: 'roadtrips',   label: 'Road trips',             icon: '🚗' },
  { value: 'cafes',       label: 'Café hopping',           icon: '☕' },
  { value: 'books',       label: 'Books & quiet spots',    icon: '📚' },
  { value: 'markets',     label: 'Shopping & markets',     icon: '🛍️' },
  { value: 'stargazing',  label: 'Stargazing',             icon: '🌌' },
  { value: 'gaming',      label: 'Gaming & pop culture',   icon: '🎮' },
  { value: 'adventure',   label: 'Outdoor adventure',      icon: '🧗' },
];

export const PRIORITIES = [
  { value: 'interests',  label: 'Similar interests',       hint: 'We enjoy the same activities' },
  { value: 'budget',     label: 'Similar budget',          hint: 'We can comfortably split expenses' },
  { value: 'pace',       label: 'Similar travel pace',     hint: 'We like exploring at the same speed' },
  { value: 'easygoing',  label: 'Easygoing personality',   hint: 'Flexible and open-minded' },
  { value: 'convo',      label: 'Good conversations',      hint: 'Someone I naturally connect with' },
  { value: 'reliable',   label: 'Reliable & considerate',  hint: 'Respects plans, boundaries, and shared costs' },
  { value: 'open',       label: 'Open to new people',      hint: 'Happy to meet different kinds of travelers' },
];
export const MAX_PRIORITIES = 3;

// Optional "Personalize your matches" section. 'flexible' means no preference.
export const OPTIONAL_PREFS = [
  { key: 'stay',      question: 'Preferred accommodation',
    options: [['hostel','Hostel'],['homestay','Homestay'],['hotel','Hotel'],['camping','Camping'],['flexible','Flexible']] },
  { key: 'transport', question: 'Getting around',
    options: [['walk','Walking'],['public','Public transport'],['rental','Rental vehicle'],['bike','Two-wheeler'],['flexible','Flexible']] },
  { key: 'wake',      question: 'Typical wake-up time',
    options: [['early','Early bird'],['mid','Mid-morning'],['night','Night owl'],['flexible','Depends on the trip']] },
  { key: 'planning',  question: 'Planning style',
    options: [['ahead','Plan ahead'],['essentials','Plan essentials'],['together','Decide together'],['spontaneous','Spontaneous']] },
  { key: 'expenses',  question: 'Shared expenses',
    options: [['equal','Split equally'],['own','Pay for own expenses'],['per_activity','Agree per activity']] },
];

export const GROUP_SIZE = [
  { value: 'one',  label: 'Just one companion' },
  { value: 'few',  label: '3–4 people' },
  { value: 'many', label: '5+ people' },
  { value: 'any',  label: 'No preference' },
];

// Turn a stored code into the label users should see.
// Usage: labelOf(PACE, 'slow') -> 'Slow & relaxed'
export function labelOf(list, code) {
  const hit = list.find((o) => o.value === code);
  return hit ? hit.label : code; // fall back to the raw code if unknown
}

// Turn an array of codes into labels, e.g. interests
export function labelsOf(list, codes = []) {
  return codes.map((c) => labelOf(list, c));
}