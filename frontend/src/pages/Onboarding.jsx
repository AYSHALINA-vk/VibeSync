import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ---------- images (remote, with gradient fallbacks) ----------
const img = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`
const HERO = img('photo-1506905925346-21bda4d32df4', 2000)

const ESCAPES = [
  { v: 'mountains', title: 'Mountains', desc: 'Ridge trails, cold sunrises, thin air.',
    src: img('photo-1464822759023-fed622ff2c3b', 800), fallback: 'linear-gradient(160deg,#27425a,#0c1f17)' },
  { v: 'ocean', title: 'Ocean', desc: 'Salt air, slow tides, golden-hour shores.',
    src: img('photo-1507525428034-b723cf961d3e', 800), fallback: 'linear-gradient(160deg,#0f4c75,#0a1c33)' },
  { v: 'forests', title: 'Forests', desc: 'Mist, canopy light, campfire evenings.',
    src: img('photo-1441974231531-c6227db76b6e', 800), fallback: 'linear-gradient(160deg,#2f6b3f,#0c1f17)' },
  { v: 'city', title: 'City escapes', desc: 'Night markets, rooftops, late-night cafes.',
    src: img('photo-1449824913935-59a10b8d2000', 800), fallback: 'linear-gradient(160deg,#3a3f6b,#0a1c33)' },
]

const PACES = [['slow', 'Slow travel'], ['balanced', 'Balanced'], ['packed', 'Packed itinerary'], ['spontaneous', 'Spontaneous']]
const BUDGETS = [['budget', 'Budget backpacker'], ['comfort', 'Comfort-focused'], ['luxury', 'Luxury'], ['flexible', 'Depends on the trip']]
const ENERGY = [['quiet', 'Quiet and peaceful'], ['balanced', 'A mix of both'], ['social', 'Very social']]
const INTERESTS = ['Photography', 'Trekking', 'Reading', 'Music', 'Food hunting', 'Camping', 'Gaming', 'Art', 'Cafe hopping', 'Road trips', 'Beaches', 'Nightlife']
const VIBE_TAGS = ['Spontaneous', 'Budget explorer', 'Slow travel', 'Early-morning treks', 'Night owl', 'Planner']

// keeps the existing `landscape` column working for matching
function toLandscape(sel) {
  const m = sel.includes('mountains'), o = sel.includes('ocean')
  if (m && o) return 'both'
  if (m) return 'mountains'
  if (o) return 'beaches'
  return sel[0] || null
}

// ---------- small UI pieces ----------
function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-4 py-2 rounded-full text-sm border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c] ${
        active
          ? 'bg-[#b8f13c] text-[#0c1f17] border-[#b8f13c] font-semibold scale-[1.03]'
          : 'bg-white/5 text-[#f2efe6]/80 border-white/15 hover:border-[#b8f13c]/60 hover:text-[#f2efe6]'
      }`}>
      {children}
    </button>
  )
}

function Panel({ title, hint, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur p-6 sm:p-8 space-y-4">
      <div>
        <h2 className="vs-display text-2xl">{title}</h2>
        {hint && <p className="text-sm text-[#f2efe6]/55 mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

function EscapeCard({ item, active, onClick }) {
  const [broken, setBroken] = useState(false)
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`group relative overflow-hidden rounded-3xl text-left aspect-[4/5] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#b8f13c]/70 transition-all duration-300 ${
        active ? 'ring-4 ring-[#b8f13c] -translate-y-1 shadow-[0_20px_50px_-12px_rgba(184,241,60,0.45)]'
               : 'ring-1 ring-white/10 hover:-translate-y-1 hover:ring-white/30'
      }`}
      style={{ background: item.fallback }}>
      {!broken && (
        <img src={item.src} alt="" loading="lazy" onError={() => setBroken(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      )}
      <div className={`absolute inset-0 transition-opacity duration-300 ${active ? 'opacity-90' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(to top, rgba(8,20,16,.92) 5%, rgba(8,20,16,.25) 55%, rgba(8,20,16,.05))' }} />
      <span className={`absolute top-4 right-4 grid place-items-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
        active ? 'bg-[#b8f13c] text-[#0c1f17] scale-100 opacity-100' : 'bg-white/10 text-transparent scale-75 opacity-0 group-hover:opacity-100'
      }`}>✓</span>
      <div className="absolute bottom-0 p-5">
        <h3 className="vs-display text-2xl text-[#f2efe6]">{item.title}</h3>
        <p className="text-sm text-[#f2efe6]/70 mt-1 leading-snug">{item.desc}</p>
      </div>
    </button>
  )
}

// ---------- page ----------
export default function Onboarding() {
  const { user, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [heroBroken, setHeroBroken] = useState(false)

  const [form, setForm] = useState({
    display_name: '', age: '', home_city: '', bio: '',
    pace: '', budget_style: '', social_energy: '',
    group_size_pref: 4, deal_breakers: '',
    destination: '', start_date: '', end_date: '', trip_budget: '',
    favourites: '', extras_visibility: 'connections',
  })
  const [escapes, setEscapes] = useState([])
  const [interests, setInterests] = useState([])
  const [tags, setTags] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggle = (list, setList, item) =>
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])

  async function handleSave() {
    setError('')
    if (!form.display_name.trim()) return setError('Add a display name so people know who you are.')
    if (!form.destination.trim() || !form.start_date || !form.end_date)
      return setError('Add your next trip: a destination and both dates.')
    if (form.end_date < form.start_date) return setError('Your trip end date must be after the start date.')

    setSaving(true)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: form.display_name.trim(),
      age: form.age ? Number(form.age) : null,
      home_city: form.home_city.trim() || null,
      bio: form.bio.trim() || null,
      personality_tags: tags,
      landscape: toLandscape(escapes),
      pace: form.pace || null,
      budget_style: form.budget_style || null,
      social_energy: form.social_energy || null,
      interests,
      group_size_pref: Number(form.group_size_pref),
      deal_breakers: form.deal_breakers.trim() || null,
      extras: { favourites: form.favourites.trim(), escapes },
      visibility: { extras: form.extras_visibility, story: 'public' },
    })
    if (profileError) { setSaving(false); return setError(profileError.message) }

    const { error: tripError } = await supabase.from('trips').insert({
      user_id: user.id,
      destination: form.destination.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      budget: form.trip_budget ? Number(form.trip_budget) : null,
    })
    if (tripError) { setSaving(false); return setError(tripError.message) }

    await reloadProfile()
    setSaving(false)
    navigate('/')
  }

  const field = 'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[#f2efe6] placeholder-[#f2efe6]/40 focus:outline-none focus:border-[#b8f13c] focus:ring-2 focus:ring-[#b8f13c]/30 transition'
  const label = 'block text-sm text-[#f2efe6]/60 space-y-1'
  const sub = 'text-sm text-[#f2efe6]/60'

  return (
    <div className="vs-root min-h-screen bg-[#0c1f17] text-[#f2efe6]" style={{ colorScheme: 'dark' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;600&display=swap');
        .vs-root { font-family: 'Manrope', system-ui, sans-serif; }
        .vs-display { font-family: 'Fraunces', Georgia, serif; font-weight: 600; letter-spacing: -0.01em; }
        @keyframes vs-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        @keyframes vs-drift { from { transform: scale(1.08); } to { transform: scale(1.18) translateY(-1%); } }
        .vs-rise { opacity: 0; animation: vs-rise .9s cubic-bezier(.2,.7,.2,1) forwards; }
        .vs-d1 { animation-delay: .15s } .vs-d2 { animation-delay: .35s } .vs-d3 { animation-delay: .55s }
        .vs-drift { animation: vs-drift 24s ease-in-out infinite alternate; }
        .vs-root select option { background: #0c1f17; color: #f2efe6; }
        @media (prefers-reduced-motion: reduce) { .vs-rise, .vs-drift { animation: none; opacity: 1; } }
      `}</style>

      {/* HERO */}
      <header className="relative h-[78vh] min-h-[520px] overflow-hidden"
        style={{ background: 'linear-gradient(180deg,#27425a 0%,#0a1c33 55%,#0c1f17 100%)' }}>
        {!heroBroken && (
          <img src={HERO} alt="" onError={() => setHeroBroken(true)}
            className="vs-drift absolute inset-0 w-full h-full object-cover" />
        )}
        {/* deep ocean tint rising from the bottom, then fade into the page */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,28,51,.35) 0%, rgba(10,28,51,.15) 35%, rgba(10,28,51,.75) 78%, #0c1f17 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 75% 20%, rgba(255,196,120,.28), transparent 55%)' }} />

        <div className="relative h-full max-w-5xl mx-auto px-6 flex flex-col justify-end pb-16 sm:pb-24">
          <p className="vs-rise vs-d1 text-[#b8f13c] font-semibold mb-4">VibeTrip</p>
          <h1 className="vs-rise vs-d2 vs-display text-5xl sm:text-7xl leading-[1.02] max-w-3xl">
            Find your kind of escape
          </h1>
          <p className="vs-rise vs-d3 mt-5 text-lg sm:text-xl text-[#f2efe6]/80 max-w-xl">
            Mountains, oceans, and people on your wavelength.
          </p>
          <a href="#escapes"
            className="vs-rise vs-d3 mt-8 self-start rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-7 py-3 hover:scale-105 hover:shadow-[0_10px_30px_-8px_rgba(184,241,60,.6)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
            Start building your vibe
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24 -mt-6 relative space-y-8">
        {/* ESCAPE CARDS */}
        <section id="escapes" className="pt-6 scroll-mt-6">
          <h2 className="vs-display text-3xl sm:text-4xl">Where do you feel most like yourself?</h2>
          <p className="text-[#f2efe6]/60 mt-2 mb-6">Pick every escape that pulls you in. We use this to match you with the right people.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {ESCAPES.map(e => (
              <EscapeCard key={e.v} item={e} active={escapes.includes(e.v)} onClick={() => toggle(escapes, setEscapes, e.v)} />
            ))}
          </div>
        </section>

        <Panel title="About you">
          <input className={field} placeholder="Display name *" value={form.display_name}
            onChange={e => set('display_name', e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={field} type="number" placeholder="Age (optional)" value={form.age}
              onChange={e => set('age', e.target.value)} />
            <input className={field} placeholder="Home city (city only)" value={form.home_city}
              onChange={e => set('home_city', e.target.value)} />
          </div>
          <textarea className={field} rows="2" placeholder="A line about you, e.g. Collecting sunsets and stories"
            value={form.bio} onChange={e => set('bio', e.target.value)} />
          <p className={sub}>My travel personality</p>
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map(t => <Chip key={t} active={tags.includes(t)} onClick={() => toggle(tags, setTags, t)}>{t}</Chip>)}
          </div>
        </Panel>

        <Panel title="Your next trip" hint="Required. This is how we find people who can actually travel with you.">
          <input className={field} placeholder="Destination, e.g. Munnar *" value={form.destination}
            onChange={e => set('destination', e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className={label}>Start date *
              <input className={field} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </label>
            <label className={label}>End date *
              <input className={field} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </label>
          </div>
          <input className={field} type="number" placeholder="Approx budget per person (optional)"
            value={form.trip_budget} onChange={e => set('trip_budget', e.target.value)} />
        </Panel>

        <Panel title="Your travel vibe">
          <p className={sub}>Travel pace</p>
          <div className="flex flex-wrap gap-2">
            {PACES.map(([v, l]) => <Chip key={v} active={form.pace === v} onClick={() => set('pace', v)}>{l}</Chip>)}
          </div>
          <p className={sub}>Budget style</p>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map(([v, l]) => <Chip key={v} active={form.budget_style === v} onClick={() => set('budget_style', v)}>{l}</Chip>)}
          </div>
          <p className={sub}>Social energy</p>
          <div className="flex flex-wrap gap-2">
            {ENERGY.map(([v, l]) => <Chip key={v} active={form.social_energy === v} onClick={() => set('social_energy', v)}>{l}</Chip>)}
          </div>
          <p className={sub}>Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(i => <Chip key={i} active={interests.includes(i)} onClick={() => toggle(interests, setInterests, i)}>{i}</Chip>)}
          </div>
        </Panel>

        <Panel title="Your ideal travel companion">
          <label className={label}>Preferred group size: <span className="text-[#b8f13c] font-semibold">{form.group_size_pref}</span>
            <input type="range" min="2" max="8" className="w-full accent-[#b8f13c]"
              value={form.group_size_pref} onChange={e => set('group_size_pref', e.target.value)} />
          </label>
          <input className={field} placeholder="Deal-breakers (optional)" value={form.deal_breakers}
            onChange={e => set('deal_breakers', e.target.value)} />
        </Panel>

        <Panel title="Beyond travel" hint="Optional. Books, music, food, whatever makes you easy to talk to.">
          <textarea className={field} rows="2" placeholder="Favourite books, music, food, movies..."
            value={form.favourites} onChange={e => set('favourites', e.target.value)} />
          <label className={label}>Who can see this section?
            <select className={field} value={form.extras_visibility} onChange={e => set('extras_visibility', e.target.value)}>
              <option value="public">Everyone on VibeTrip</option>
              <option value="connections">Accepted connections only</option>
              <option value="private">Only me</option>
            </select>
          </label>
        </Panel>

        {error && (
          <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</p>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold text-lg py-4 hover:scale-[1.01] hover:shadow-[0_14px_40px_-10px_rgba(184,241,60,.6)] transition disabled:opacity-60 disabled:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
          {saving ? 'Saving your vibe...' : 'Save and find my people'}
        </button>
      </main>
    </div>
  )
}
