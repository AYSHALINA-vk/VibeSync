import { useMemo, useState } from 'react'
import TravelStories from '../components/TravelStories'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ---------- images (remote, with gradient fallbacks) ----------
const img = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`
const BG_FOREST = img('photo-1448375240586-882707db888b', 1400)
const BG_SNOW = img('photo-1483728642387-6c3bdd6c93e5', 1400)

const ESCAPES = [
  { v: 'mountains', title: 'Mountains', desc: 'Trails, peaks & quiet mornings', src: img('photo-1464822759023-fed622ff2c3b', 600), fb: 'linear-gradient(160deg,#27425a,#0c1f17)' },
  { v: 'ocean', title: 'Ocean', desc: 'Blue horizons & salty air', src: img('photo-1507525428034-b723cf961d3e', 600), fb: 'linear-gradient(160deg,#0f4c75,#0a1c33)' },
  { v: 'forests', title: 'Forests', desc: 'Green paths & hidden gems', src: img('photo-1441974231531-c6227db76b6e', 600), fb: 'linear-gradient(160deg,#2f6b3f,#0c1f17)' },
  { v: 'city', title: 'City Escapes', desc: 'Culture, food & new stories', src: img('photo-1449824913935-59a10b8d2000', 600), fb: 'linear-gradient(160deg,#3a3f6b,#0a1c33)' },
]
const VIBE_TAGS = [['Spontaneous', '⚡'], ['Budget explorer', '🪙'], ['Slow travel', '🍃'], ['Early-morning treks', '☀️'], ['Night owl', '🌙'], ['Planner', '🗓️']]
const PACES = [['slow', 'Slow travel'], ['balanced', 'Balanced'], ['packed', 'Packed itinerary'], ['spontaneous', 'Spontaneous']]
const BUDGETS = [['budget', 'Budget backpacker'], ['comfort', 'Comfort-focused'], ['luxury', 'Luxury'], ['flexible', 'Depends on the trip']]
const ENERGY = [['quiet', 'Quiet and peaceful'], ['balanced', 'A mix of both'], ['social', 'Very social']]
const INTERESTS = ['Photography', 'Trekking', 'Reading', 'Music', 'Food hunting', 'Camping', 'Gaming', 'Art', 'Cafe hopping', 'Road trips', 'Beaches', 'Nightlife']
const STEPS = ['About you', 'Your vibe', 'Your stories', 'Next trip']
// keeps the existing `landscape` column working for matching
function toLandscape(sel) {
  const m = sel.includes('mountains'), o = sel.includes('ocean')
  if (m && o) return 'both'
  if (m) return 'mountains'
  if (o) return 'beaches'
  return sel[0] || null
}

// ---------- falling leaves (left) and snow (right) ----------
function Weather() {
  const { leaves, flakes } = useMemo(() => {
    const r = (a, b) => a + Math.random() * (b - a)
    return {
      leaves: Array.from({ length: 16 }, (_, i) => ({
        left: r(0, 46), size: r(14, 28), dur: r(9, 17), delay: -r(0, 17), dx: r(-100, 170), rot: r(240, 720),
        c: ['#b8f13c', '#6fbf3a', '#3f8f3a', '#e0b84a'][i % 4],
      })),
      flakes: Array.from({ length: 48 }, () => ({
        left: r(54, 100), size: r(2, 6), dur: r(7, 16), delay: -r(0, 16), dx: r(-70, 70), op: r(0.55, 0.95),
      })),
    }
  }, [])
  return (
    <div aria-hidden className="vs-fx pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {leaves.map((l, i) => (
        <span key={'l' + i} className="vs-fall absolute top-0"
          style={{ left: `${l.left}%`, width: l.size, height: l.size, borderRadius: '0 100% 0 100%',
            background: `linear-gradient(135deg,${l.c},#1f5a2c)`, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))',
            '--dx': `${l.dx}px`, '--rot': `${l.rot}deg`, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s` }} />
      ))}
      {flakes.map((f, i) => (
        <span key={'f' + i} className="vs-fall absolute top-0 rounded-full bg-white"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, opacity: f.op, filter: 'blur(.6px)',
            '--dx': `${f.dx}px`, '--rot': '0deg', animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }} />
      ))}
    </div>
  )
}

// ---------- small UI pieces ----------
function Chip({ active, onClick, icon, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c] ${
        active ? 'bg-[#b8f13c] text-[#0c1f17] border-[#b8f13c] font-semibold'
               : 'bg-white/5 text-[#f2efe6]/85 border-white/15 hover:border-[#b8f13c]/60 hover:bg-white/10'}`}>
      {icon && <span aria-hidden>{icon}</span>}{children}
    </button>
  )
}

function Stepper({ step, go }) {
  return (
    <ol className="flex items-start max-w-md mx-auto mb-7">
      {STEPS.map((s, i) => (
        <li key={s} className="relative flex-1 flex flex-col items-center">
          {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-px ${i <= step ? 'bg-[#b8f13c]' : 'bg-white/20'}`} />}
          <button type="button" disabled={i > step} onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}
            className={`relative z-10 grid place-items-center w-8 h-8 rounded-full text-sm font-semibold border transition-all ${
              i === step ? 'bg-[#b8f13c] text-[#0c1f17] border-[#b8f13c] scale-110'
              : i < step ? 'bg-[#0c1f17] text-[#b8f13c] border-[#b8f13c]' : 'bg-[#0c1f17] text-white/60 border-white/25'}`}>
            {i < step ? '✓' : i + 1}
          </button>
          <span className={`mt-2 text-sm ${i === step ? 'text-[#b8f13c]' : 'text-white/60'}`}>{s}</span>
        </li>
      ))}
    </ol>
  )
}

function EscapeCard({ item, active, onClick }) {
  const [broken, setBroken] = useState(false)
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{ background: item.fb }}
      className={`group relative overflow-hidden rounded-2xl text-left aspect-[5/4] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#b8f13c]/70 transition-all duration-300 ${
        active ? 'ring-2 ring-[#b8f13c] -translate-y-1 shadow-[0_16px_40px_-12px_rgba(184,241,60,.5)]' : 'ring-1 ring-white/15 hover:-translate-y-1 hover:ring-white/40'}`}>
      {!broken && <img src={item.src} alt="" loading="lazy" onError={() => setBroken(true)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(8,20,16,.92) 8%,rgba(8,20,16,.15) 60%)' }} />
      <span className={`absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 ${
        active ? 'bg-[#b8f13c] text-[#0c1f17] scale-100' : 'scale-0'}`}>✓</span>
      <div className="absolute bottom-0 p-3">
        <h3 className="font-semibold text-[#f2efe6] leading-tight">{item.title}</h3>
        <p className="text-xs text-[#f2efe6]/70 leading-snug mt-0.5">{item.desc}</p>
      </div>
    </button>
  )
}

function Field({ icon, className = '', children }) {
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden className="absolute left-4 top-3.5 text-sm opacity-60">{icon}</span>
      {children}
    </div>
  )
}

// ---------- page ----------
export default function Onboarding() {
  const { user, reloadProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bgBroken, setBgBroken] = useState({ l: false, r: false })

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

  function next() {
    setError('')
    if (step === 0 && !form.display_name.trim()) return setError('Add a display name so people know who you are.')
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function go(i) { setError(''); setStep(i) }

  async function handleSave() {
    setError('')
    if (!form.display_name.trim()) { setStep(0); return setError('Add a display name so people know who you are.') }
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

  const field = 'w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-4 py-3 text-[#f2efe6] placeholder-[#f2efe6]/45 focus:outline-none focus:border-[#b8f13c] focus:ring-2 focus:ring-[#b8f13c]/30 transition'
  const plain = field.replace('pl-11', 'pl-4')
  const label = 'block text-sm text-[#f2efe6]/65 space-y-1'
  const sub = 'text-sm font-semibold text-[#f2efe6]/85'

  return (
    <div className="vs-root relative min-h-screen bg-[#0c1f17] text-[#f2efe6]" style={{ colorScheme: 'dark' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600&display=swap');
        .vs-root { font-family: 'Manrope', system-ui, sans-serif; }
        .vs-display { font-family: 'Fraunces', Georgia, serif; font-weight: 700; letter-spacing: -0.015em; }
        .vs-script { font-family: 'Caveat', cursive; font-weight: 700; }
        .vs-root select option { background: #0c1f17; color: #f2efe6; }
        @keyframes vs-fall { 0% { transform: translate3d(0,-8vh,0) rotate(0); opacity: 0 } 8% { opacity: 1 }
          100% { transform: translate3d(var(--dx),108vh,0) rotate(var(--rot)); opacity: .9 } }
        .vs-fall { animation: vs-fall linear infinite; will-change: transform; }
        @keyframes vs-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .vs-in { animation: vs-in .35s ease-out; }
        @media (prefers-reduced-motion: reduce) { .vs-fx { display: none } .vs-in { animation: none } }
      `}</style>

      {/* split scenery: forest left, snow right */}
      <div aria-hidden className="fixed inset-0 z-0 flex">
        <div className="w-1/2 h-full bg-cover bg-center" style={{ background: 'linear-gradient(160deg,#2f6b3f,#0c1f17)' }}>
          {!bgBroken.l && <img src={BG_FOREST} alt="" onError={() => setBgBroken(b => ({ ...b, l: true }))} className="w-full h-full object-cover" />}
        </div>
        <div className="w-1/2 h-full" style={{ background: 'linear-gradient(200deg,#4a6a8a,#0a1c33)' }}>
          {!bgBroken.r && <img src={BG_SNOW} alt="" onError={() => setBgBroken(b => ({ ...b, r: true }))} className="w-full h-full object-cover" />}
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(12,31,23,.35),rgba(12,31,23,.55) 50%,rgba(10,28,51,.4))' }} />
      </div>
      <Weather />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
        <span className="vs-display text-2xl">VibeTrip</span>
        <nav className="hidden sm:flex gap-3 text-sm text-[#f2efe6]/80">
          <span>Meet</span><span className="text-[#b8f13c]">+</span><span>Explore</span><span className="text-[#b8f13c]">+</span><span>Travel Together</span>
        </nav>
      </header>
      <p aria-hidden className="vs-script hidden xl:block fixed z-10 left-[5%] top-[30%] text-3xl leading-tight -rotate-12 w-28 text-[#f2efe6]/90">Same Passion Different Paths</p>
      <p aria-hidden className="vs-script hidden xl:block fixed z-10 right-[6%] top-[17%] text-3xl leading-tight -rotate-12 w-28 text-[#f2efe6]/90">Different Places Same Vibe</p>

      <main className="relative z-10 px-4 py-8 sm:py-10">
        <div className="max-w-[860px] mx-auto rounded-[2rem] border border-white/15 bg-[#0c1f17]/65 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] p-6 sm:p-12">
          <Stepper step={step} go={go} />
          <h1 className="vs-display text-3xl sm:text-5xl leading-tight">Find your kind of escape 🍃</h1>
          <p className="text-[#f2efe6]/75 mt-2 mb-8">Mountains, oceans, and people on your wavelength.</p>

          <div key={step} className="vs-in space-y-6">
            {step === 0 && (<>
              <h2 className="vs-display text-2xl">About you</h2>
              <Field icon="👤"><input className={field} placeholder="Display name *" value={form.display_name}
                onChange={e => set('display_name', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field icon="📅"><input className={field} type="number" placeholder="Age (optional)" value={form.age}
                  onChange={e => set('age', e.target.value)} /></Field>
                <Field icon="📍"><input className={field} placeholder="Home city (city only)" value={form.home_city}
                  onChange={e => set('home_city', e.target.value)} /></Field>
              </div>
              <Field icon="✏️">
                <textarea className={field} rows="2" maxLength={150} placeholder="A line about you, e.g. Collecting sunsets and stories"
                  value={form.bio} onChange={e => set('bio', e.target.value)} />
                <span className="absolute right-3 bottom-2 text-xs text-white/45">{form.bio.length}/150</span>
              </Field>
              <p className={sub}>My travel personality</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {VIBE_TAGS.map(([t, ic]) => <Chip key={t} icon={ic} active={tags.includes(t)} onClick={() => toggle(tags, setTags, t)}>{t}</Chip>)}
              </div>
              <div className="pt-2">
                <h2 className="vs-display text-2xl">Where do you feel most alive?</h2>
                <p className="text-sm text-[#f2efe6]/65 mt-1 mb-4">Pick one or more — we'll match you with people who love the same kind of places.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ESCAPES.map(e => <EscapeCard key={e.v} item={e} active={escapes.includes(e.v)} onClick={() => toggle(escapes, setEscapes, e.v)} />)}
                </div>
              </div>
            </>)}

            {step === 3 && (<>
              <h2 className="vs-display text-2xl">Your travel stories</h2>
              <p className={sub}>Share a memorable travel experience</p>
              <textarea className={plain} rows="4" placeholder="Describe a moment that made your heart race..."
                value={form.travel_story} onChange={e => set('travel_story', e.target.value)} />
            </>)}

            {step === 1 && (<>
              <h2 className="vs-display text-2xl">Your travel vibe</h2>
              <p className={sub}>Travel pace</p>
              <div className="flex flex-wrap gap-2">{PACES.map(([v, l]) => <Chip key={v} active={form.pace === v} onClick={() => set('pace', v)}>{l}</Chip>)}</div>
              <p className={sub}>Budget style</p>
              <div className="flex flex-wrap gap-2">{BUDGETS.map(([v, l]) => <Chip key={v} active={form.budget_style === v} onClick={() => set('budget_style', v)}>{l}</Chip>)}</div>
              <p className={sub}>Social energy</p>
              <div className="flex flex-wrap gap-2">{ENERGY.map(([v, l]) => <Chip key={v} active={form.social_energy === v} onClick={() => set('social_energy', v)}>{l}</Chip>)}</div>
              <p className={sub}>Interests</p>
              <div className="flex flex-wrap gap-2">{INTERESTS.map(i => <Chip key={i} active={interests.includes(i)} onClick={() => toggle(interests, setInterests, i)}>{i}</Chip>)}</div>
              <h2 className="vs-display text-2xl pt-2">Your ideal travel companion</h2>
              <label className={label}>Preferred group size: <span className="text-[#b8f13c] font-semibold">{form.group_size_pref}</span>
                <input type="range" min="2" max="8" className="w-full accent-[#b8f13c]" value={form.group_size_pref}
                  onChange={e => set('group_size_pref', e.target.value)} />
              </label>
              <input className={plain} placeholder="Deal-breakers (optional)" value={form.deal_breakers} onChange={e => set('deal_breakers', e.target.value)} />
              <h2 className="vs-display text-2xl pt-2">Beyond travel <span className="text-sm font-normal text-white/50">optional</span></h2>
              <textarea className={plain} rows="2" placeholder="Favourite books, music, food, movies..."
                value={form.favourites} onChange={e => set('favourites', e.target.value)} />
              <label className={label}>Who can see this section?
                <select className={plain} value={form.extras_visibility} onChange={e => set('extras_visibility', e.target.value)}>
                  <option value="public">Everyone on VibeTrip</option>
                  <option value="connections">Accepted connections only</option>
                  <option value="private">Only me</option>
                </select>
              </label>
            </>)}

            {step === 2 && <TravelStories user={user} />}

            {step === 3 && (<>
              <h2 className="vs-display text-2xl">Your next trip</h2>
              <p className="text-sm text-[#f2efe6]/65 -mt-3">Required. This is how we find people who can actually travel with you.</p>
              <Field icon="📍"><input className={field} placeholder="Destination, e.g. Munnar *" value={form.destination}
                onChange={e => set('destination', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className={label}>Start date *<input className={plain} type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} /></label>
                <label className={label}>End date *<input className={plain} type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} /></label>
              </div>
              <input className={plain} type="number" placeholder="Approx budget per person (optional)" value={form.trip_budget}
                onChange={e => set('trip_budget', e.target.value)} />
            </>)}
          </div>

          {error && <p role="alert" className="mt-6 rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</p>}

          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => go(step - 1)}
                className="rounded-full border border-white/25 px-6 py-3 hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]">Back</button>
            )}
            {step < 3 ? (
              <button type="button" onClick={next}
                className="flex-1 rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold py-3.5 hover:scale-[1.01] hover:shadow-[0_14px_40px_-10px_rgba(184,241,60,.6)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">Continue</button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex-1 rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold py-3.5 hover:scale-[1.01] hover:shadow-[0_14px_40px_-10px_rgba(184,241,60,.6)] transition disabled:opacity-60 disabled:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
                {saving ? 'Saving your vibe...' : 'Save and find my people'}</button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
