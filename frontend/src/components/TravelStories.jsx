import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { INTERESTS, labelsOf } from '../lib/vibeOptions'

const BUCKET = 'story-photos'
const MAX = 8, MAX_MB = 5
const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BANNER = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=70'
const field = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f2efe6] placeholder-[#f2efe6]/45 focus:outline-none focus:border-[#b8f13c] focus:ring-2 focus:ring-[#b8f13c]/30'
const btn = 'rounded-full px-4 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]'

export default function TravelStories({ user }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(true)
  const [drag, setDrag] = useState(false)
  const [msg, setMsg] = useState('')
  const [bannerBroken, setBannerBroken] = useState(false)
  const fileRef = useRef(null)

  const patch = (id, p) => setStories(s => s.map(x => (x.id === id ? { ...x, ...p } : x)))

  useEffect(() => { load() }, [user.id])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('travel_stories').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) { setMsg(error.message); return setLoading(false) }
    const urls = {}
    if (data.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(data.map(d => d.photo_path), 3600)
      signed?.forEach(s => { urls[s.path] = s.signedUrl })
    }
    setStories(data.map(d => ({ ...d, tags: d.tags || [], url: urls[d.photo_path] })))
    setShowAll(data.every(d => d.is_public))
    setLoading(false)
  }

  async function addFiles(list) {
    setMsg('')
    const room = MAX - stories.length
    if (room <= 0) return setMsg(`You can add up to ${MAX} photos. Delete one to add another.`)
    const ok = [], notes = []
    for (const f of Array.from(list)) {
      if (!TYPES.includes(f.type)) notes.push(`${f.name}: use a JPG, PNG or WebP file`)
      else if (f.size > MAX_MB * 1048576) notes.push(`${f.name}: larger than ${MAX_MB} MB`)
      else ok.push(f)
    }
    if (ok.length > room) notes.push(`Only ${room} more photo${room === 1 ? '' : 's'} fit, so the rest were skipped`)
    if (notes.length) setMsg(notes.join('. '))
    const temps = ok.slice(0, room).map(f => ({
      id: 'tmp-' + crypto.randomUUID(), file: f, url: URL.createObjectURL(f), uploading: true, tags: [],
      title: f.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Untitled', is_public: showAll,
    }))
    setStories(s => [...temps, ...s]) // previews show immediately
    for (const t of temps) {
      const ext = { 'image/png': 'png', 'image/webp': 'webp' }[t.file.type] || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const drop = e => { setStories(s => s.filter(x => x.id !== t.id)); setMsg(e) }
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, t.file, { contentType: t.file.type })
      if (upErr) { drop(upErr.message); continue }
      const { data, error } = await supabase.from('travel_stories')
        .insert({ user_id: user.id, photo_path: path, title: t.title, is_public: t.is_public }).select().single()
      if (error) { await supabase.storage.from(BUCKET).remove([path]); drop(error.message); continue }
      setStories(s => s.map(x => (x.id === t.id ? { ...data, tags: [], url: t.url, editing: true, draft: { ...data, tags: [] } } : x)))
    }
  }

  async function saveStory(s) {
    const d = s.draft
    if (!d.title.trim()) return setMsg('Give your story a title.')
    const row = { title: d.title.trim(), location: d.location?.trim() || null, travel_date: d.travel_date || null,
      description: d.description?.trim() || null, tags: d.tags }
    const { error } = await supabase.from('travel_stories').update(row).eq('id', s.id)
    if (error) return setMsg(error.message)
    setMsg(''); patch(s.id, { ...row, editing: false })
  }

  async function removeStory(s) {
    if (!window.confirm('Delete this story and its photo?')) return
    const { error } = await supabase.from('travel_stories').delete().eq('id', s.id)
    if (error) return setMsg(error.message)
    await supabase.storage.from(BUCKET).remove([s.photo_path])
    setStories(list => list.filter(x => x.id !== s.id))
  }

  async function setVisible(s, v) {
    patch(s.id, { is_public: v })
    const { error } = await supabase.from('travel_stories').update({ is_public: v }).eq('id', s.id)
    if (error) { patch(s.id, { is_public: !v }); setMsg(error.message) }
  }

  async function toggleAll(v) {
    setShowAll(v)
    setStories(list => list.map(x => ({ ...x, is_public: v })))
    const { error } = await supabase.from('travel_stories').update({ is_public: v }).eq('user_id', user.id)
    if (error) { setMsg(error.message); load() }
  }

  const draftSet = (s, k, v) => patch(s.id, { draft: { ...s.draft, [k]: v } })
  const toggleTag = (s, code) => draftSet(s, 'tags', s.draft.tags.includes(code) ? s.draft.tags.filter(x => x !== code) : [...s.draft.tags, code])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="vs-display text-2xl">Your travel stories</h2>
        <p className="text-sm text-[#f2efe6]/65 mt-1">Show future travel buddies the places that made you, you.</p>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 cursor-pointer">
        <span>
          <span className="block font-semibold">Visible on your traveler profile</span>
          <span className="block text-xs text-[#f2efe6]/60">Turns every story public or private. You can still change each one below.</span>
        </span>
        <input type="checkbox" role="switch" checked={showAll} onChange={e => toggleAll(e.target.checked)} className="sr-only peer" />
        <span aria-hidden className="relative w-12 h-7 shrink-0 rounded-full bg-white/20 peer-checked:bg-[#b8f13c] peer-focus-visible:ring-2 peer-focus-visible:ring-white transition after:absolute after:top-1 after:left-1 after:w-5 after:h-5 after:rounded-full after:bg-white peer-checked:after:bg-[#0c1f17] peer-checked:after:translate-x-5 after:transition" />
      </label>

      <div role="button" tabIndex={0} aria-label="Upload photos"
        onClick={() => fileRef.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition ${drag ? 'border-[#b8f13c] scale-[1.01]' : 'border-white/25 hover:border-[#b8f13c]/70'}`}
        style={{ background: 'linear-gradient(160deg,#27425a,#0c1f17)' }}>
        {!bannerBroken && <img src={BANNER} alt="" onError={() => setBannerBroken(true)} className="absolute inset-0 w-full h-full object-cover opacity-35" />}
        <div className="absolute inset-0 bg-[#0c1f17]/55" />
        <div className="relative space-y-3">
          <p className="text-3xl" aria-hidden>🏔️</p>
          <p className="font-semibold text-lg">Drag and drop your trip photos here</p>
          <p className="text-sm text-[#f2efe6]/70">JPG, PNG or WebP, up to {MAX_MB} MB each. {stories.length} of {MAX} added.</p>
          <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
            className={`${btn} bg-[#b8f13c] text-[#0c1f17] font-semibold px-6 py-2.5`}>Browse photos</button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
          onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {msg && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{msg}</p>}
      {loading && <p className="text-sm text-white/60">Loading your stories...</p>}
      {!loading && !stories.length && <p className="text-sm text-white/60">No stories yet. Add a photo from a trip that shaped you.</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {stories.map(s => (
          <article key={s.id} className="rounded-3xl overflow-hidden border border-white/15 bg-white/[0.06] backdrop-blur">
            <div className="relative aspect-[4/3] bg-black/30">
              {s.url && <img src={s.url} alt={s.title} className="w-full h-full object-cover" />}
              {s.uploading && <div className="absolute inset-0 grid place-items-center bg-black/55 text-sm">Uploading...</div>}
              {!s.uploading && (
                <button type="button" onClick={() => setVisible(s, !s.is_public)} aria-pressed={s.is_public}
                  className={`${btn} absolute top-3 left-3 text-xs ${s.is_public ? 'bg-[#b8f13c] text-[#0c1f17] font-semibold' : 'bg-black/60 text-white'}`}>
                  {s.is_public ? 'Public' : 'Private'}
                </button>
              )}
            </div>
            {!s.uploading && (s.editing ? (
              <div className="p-4 space-y-2">
                <input className={field} placeholder="Title *" maxLength={80} value={s.draft.title} onChange={e => draftSet(s, 'title', e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={field} placeholder="Location" value={s.draft.location || ''} onChange={e => draftSet(s, 'location', e.target.value)} />
                  <input className={field} type="date" value={s.draft.travel_date || ''} onChange={e => draftSet(s, 'travel_date', e.target.value)} />
                </div>
                <textarea className={field} rows="2" maxLength={240} placeholder="What made this place special?" value={s.draft.description || ''} onChange={e => draftSet(s, 'description', e.target.value)} />
                <div className="flex flex-wrap gap-1.5">
                  {INTERESTS.map(t => (
                    <button key={t.value} type="button" aria-pressed={s.draft.tags.includes(t.value)} onClick={() => toggleTag(s, t.value)}
                      className={`${btn} text-xs border ${s.draft.tags.includes(t.value) ? 'bg-[#b8f13c] text-[#0c1f17] border-[#b8f13c]' : 'border-white/20 text-white/75 hover:border-[#b8f13c]/60'}`}>
                      <span aria-hidden>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => saveStory(s)} className={`${btn} bg-[#b8f13c] text-[#0c1f17] font-semibold`}>Save story</button>
                  <button type="button" onClick={() => patch(s.id, { editing: false })} className={`${btn} border border-white/25`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-1">
                <h3 className="vs-display text-lg leading-tight">{s.title}</h3>
                <p className="text-xs text-[#f2efe6]/60">{[s.location, s.travel_date].filter(Boolean).join(' · ') || 'Add a location and date'}</p>
                {s.description && <p className="text-sm text-[#f2efe6]/80">{s.description}</p>}
                {!!s.tags.length && <p className="text-xs text-[#b8f13c]">{labelsOf(INTERESTS, s.tags).join(', ')}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => patch(s.id, { editing: true, draft: { ...s, tags: [...s.tags] } })} className={`${btn} border border-white/25 hover:bg-white/10`}>Edit</button>
                  <button type="button" onClick={() => removeStory(s)} className={`${btn} border border-red-400/40 text-red-200 hover:bg-red-500/10`}>Delete</button>
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  )
}