import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import TravelStories from '../components/TravelStories'
import { INTERESTS, PACE, BUDGET_STYLE, SOCIAL_ENERGY, labelOf, labelsOf } from '../lib/vibeOptions'

const BUCKET = 'story-photos'
const BADGES = [
  ['email_verified', 'Email'],
  ['phone_verified', 'Phone'],
  ['identity_verified', 'ID'],
  ['trip_verified', 'Trip'],
]

const input = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f2efe6] placeholder-[#f2efe6]/45 focus:outline-none focus:border-[#b8f13c] focus:ring-2 focus:ring-[#b8f13c]/30'

function Chip({ active, onClick, icon, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c] ${
        active ? 'bg-[#b8f13c] text-[#0c1f17] border-[#b8f13c] font-semibold'
               : 'bg-white/5 text-[#f2efe6]/85 border-white/15 hover:border-[#b8f13c]/60'}`}>
      {icon && <span aria-hidden>{icon}</span>}{children}
    </button>
  )
}

export default function Profile() {
  const { id } = useParams()
  const { user, reloadProfile } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', profile: null, stories: [] })
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState(false)
  const [managing, setManaging] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let alive = true
    async function load() {
      setState(s => ({ ...s, loading: true, error: '' }))

      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      if (!alive) return
      if (error) return setState({ loading: false, error: error.message, profile: null, stories: [] })
      if (!profile || (profile.hidden && profile.id !== user?.id))
        return setState({ loading: false, error: 'This profile is not available.', profile: null, stories: [] })

      // only public stories, the database also enforces this
      const { data: rows } = await supabase.from('travel_stories').select('*')
        .eq('user_id', id).eq('is_public', true).order('created_at', { ascending: false })
      const list = rows || []

      const urls = {}
      if (list.length) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(list.map(s => s.photo_path), 3600)
        signed?.forEach(s => { urls[s.path] = s.signedUrl })
      }
      if (!alive) return
      setState({ loading: false, error: '', profile, stories: list.map(s => ({ ...s, tags: s.tags || [], url: urls[s.photo_path] })) })
    }
    load()
    return () => { alive = false }
  }, [id, reloadKey])

  const { loading, error, profile: p, stories } = state
  const isMe = user?.id === id
  const extras = p?.extras || {}
  const showExtras = isMe || p?.visibility?.extras === 'public'
  const verified = p ? BADGES.filter(([k]) => p[k]) : []
  const places = [...new Set(stories.map(s => s.location).filter(Boolean))]

  function startEdit() {
    setFormError('')
    setDraft({
      display_name: p.display_name || '',
      age: p.age ?? '',
      home_city: p.home_city || '',
      bio: p.bio || '',
      pace: p.pace || '',
      budget_style: p.budget_style || '',
      social_energy: p.social_energy || '',
      interests: p.interests || [],
      other_interests: extras.other_interests || '',
    })
    setEditing(true)
  }

  const setD = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const pickD = (k, v) => setDraft(d => ({ ...d, [k]: d[k] === v ? '' : v })) // click again to clear
  const toggleInterest = v => setDraft(d => ({
    ...d, interests: d.interests.includes(v) ? d.interests.filter(x => x !== v) : [...d.interests, v],
  }))

  async function save() {
    setFormError('')
    if (!draft.display_name.trim()) return setFormError('Your display name cannot be empty.')
    const age = draft.age === '' ? null : Number(draft.age)
    if (age !== null && (!Number.isInteger(age) || age < 13 || age > 100)) return setFormError('Enter an age between 13 and 100, or leave it empty.')

    setSaving(true)
    const { error: err } = await supabase.from('profiles').update({
      display_name: draft.display_name.trim(),
      age,
      home_city: draft.home_city.trim() || null,
      bio: draft.bio.trim() || null,
      pace: draft.pace || null,
      budget_style: draft.budget_style || null,
      social_energy: draft.social_energy || null,
      interests: draft.interests,
      extras: { ...extras, other_interests: draft.other_interests.trim() },
    }).eq('id', user.id)
    setSaving(false)
    if (err) return setFormError(err.message)

    setEditing(false)
    setReloadKey(k => k + 1)
    reloadProfile?.()
  }

  function closeStories() {
    setManaging(false)
    setReloadKey(k => k + 1) // refresh the public story list
  }

  return (
    <div className="min-h-screen bg-[#0c1f17] text-[#f2efe6]" style={{ colorScheme: 'dark', fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <header className="flex items-center justify-between px-6 sm:px-10 pt-6">
        <Link to="/" className="text-2xl font-bold">VibeTrip</Link>
        <Link to="/" className="text-sm text-[#f2efe6]/80 hover:text-[#b8f13c]">Back to Discover</Link>
      </header>

      <main className="max-w-[860px] mx-auto px-4 py-8 space-y-6">
        {loading && !p && <p className="text-sm text-white/60">Loading profile...</p>}
        {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</p>}

        {p && (<>
          <section className="rounded-3xl border border-white/15 bg-white/[0.06] p-6 space-y-4">
            {!editing ? (<>
              <div className="flex items-start gap-4">
                <div className="grid place-items-center w-16 h-16 rounded-full bg-[#b8f13c]/20 text-2xl font-bold text-[#b8f13c] shrink-0">
                  {p.display_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl font-bold leading-tight">{p.display_name}{p.age ? `, ${p.age}` : ''}</h1>
                  <p className="text-sm text-[#f2efe6]/60">{p.home_city || 'City not shared'}</p>
                  {p.bio && <p className="mt-2 text-[#f2efe6]/85">{p.bio}</p>}
                </div>
                {isMe && (
                  <button type="button" onClick={startEdit}
                    className="shrink-0 rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-5 py-2 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
                    Edit profile
                  </button>
                )}
              </div>

              <p className="text-xs text-[#f2efe6]/60">
                {verified.length ? `Verified: ${verified.map(([, l]) => l).join(', ')}` : 'No verification yet'}
              </p>

              <dl className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-white/5 px-3 py-2"><dt className="text-xs text-white/50">Pace</dt><dd>{p.pace ? labelOf(PACE, p.pace) : 'Not shared'}</dd></div>
                <div className="rounded-xl bg-white/5 px-3 py-2"><dt className="text-xs text-white/50">Budget</dt><dd>{p.budget_style ? labelOf(BUDGET_STYLE, p.budget_style) : 'Not shared'}</dd></div>
                <div className="rounded-xl bg-white/5 px-3 py-2"><dt className="text-xs text-white/50">Social energy</dt><dd>{p.social_energy ? labelOf(SOCIAL_ENERGY, p.social_energy) : 'Not shared'}</dd></div>
              </dl>

              {!!(p.interests || []).length && (
                <div className="flex flex-wrap gap-2">
                  {labelsOf(INTERESTS, p.interests || []).map(l => (
                    <span key={l} className="rounded-full bg-[#b8f13c]/20 px-3 py-1 text-sm">{l}</span>
                  ))}
                </div>
              )}
              {extras.other_interests && <p className="text-sm text-[#f2efe6]/70">Also into: {extras.other_interests}</p>}
              {showExtras && extras.favourites && <p className="text-sm text-[#f2efe6]/70">Favourites: {extras.favourites}</p>}
            </>) : (
              /* ---------- edit form ---------- */
              <div className="space-y-5">
                <h1 className="text-2xl font-bold">Edit your profile</h1>

                <label className="block text-sm text-[#f2efe6]/65 space-y-1">Display name *
                  <input className={input} value={draft.display_name} onChange={e => setD('display_name', e.target.value)} />
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block text-sm text-[#f2efe6]/65 space-y-1">Age (optional)
                    <input className={input} type="number" value={draft.age} onChange={e => setD('age', e.target.value)} />
                  </label>
                  <label className="block text-sm text-[#f2efe6]/65 space-y-1">Home city (city only)
                    <input className={input} value={draft.home_city} onChange={e => setD('home_city', e.target.value)} />
                  </label>
                </div>
                <label className="block text-sm text-[#f2efe6]/65 space-y-1">Bio ({draft.bio.length}/150)
                  <textarea className={input} rows="2" maxLength={150} value={draft.bio} onChange={e => setD('bio', e.target.value)} />
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Travel pace</p>
                  <div className="flex flex-wrap gap-2">
                    {PACE.map(o => <Chip key={o.value} icon={o.icon} active={draft.pace === o.value} onClick={() => pickD('pace', o.value)}>{o.label}</Chip>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Budget style</p>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_STYLE.map(o => <Chip key={o.value} icon={o.icon} active={draft.budget_style === o.value} onClick={() => pickD('budget_style', o.value)}>{o.label}</Chip>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Social energy</p>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_ENERGY.map(o => <Chip key={o.value} icon={o.icon} active={draft.social_energy === o.value} onClick={() => pickD('social_energy', o.value)}>{o.label}</Chip>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(o => <Chip key={o.value} icon={o.icon} active={draft.interests.includes(o.value)} onClick={() => toggleInterest(o.value)}>{o.label}</Chip>)}
                  </div>
                  <input className={input} maxLength={80} placeholder="Other interests, e.g. birdwatching, pottery"
                    value={draft.other_interests} onChange={e => setD('other_interests', e.target.value)} />
                </div>

                {formError && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{formError}</p>}

                <div className="flex gap-3">
                  <button type="button" onClick={save} disabled={saving}
                    className="rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-6 py-2.5 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} disabled={saving}
                    className="rounded-full border border-white/25 px-6 py-2.5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Travel stories</h2>
              {isMe && !managing && (
                <button type="button" onClick={() => setManaging(true)}
                  className="rounded-full border border-white/25 px-4 py-1.5 text-sm hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]">
                  Manage stories
                </button>
              )}
            </div>

            {isMe && managing ? (<>
              <TravelStories user={user} />
              <button type="button" onClick={closeStories}
                className="rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-6 py-2.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
                Done
              </button>
            </>) : (<>
              {places.length > 0 && <p className="text-sm text-[#f2efe6]/65">Places: {places.join(', ')}</p>}
              {!stories.length && <p className="text-sm text-white/60">No public stories yet.</p>}
              <div className="grid sm:grid-cols-2 gap-4">
                {stories.map(s => (
                  <article key={s.id} className="rounded-3xl overflow-hidden border border-white/15 bg-white/[0.06]">
                    <div className="aspect-[4/3] bg-black/30">
                      {s.url && <img src={s.url} alt={s.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-4 space-y-1">
                      <h3 className="text-lg font-bold leading-tight">{s.title}</h3>
                      <p className="text-xs text-[#f2efe6]/60">{[s.location, s.travel_date].filter(Boolean).join(' · ')}</p>
                      {s.description && <p className="text-sm text-[#f2efe6]/80">{s.description}</p>}
                      {!!s.tags.length && <p className="text-xs text-[#b8f13c]">{labelsOf(INTERESTS, s.tags).join(', ')}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </>)}
          </section>
        </>)}
      </main>
    </div>
  )
}