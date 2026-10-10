import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const BADGES = [
  ['email_verified', 'Email'],
  ['phone_verified', 'Phone'],
  ['identity_verified', 'ID'],
  ['trip_verified', 'Trip'],
]

const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function ScoreRing({ score }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <div className="relative w-16 h-16 shrink-0" role="img" aria-label={`${score} percent match`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#b8f13c" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold">{score}%</span>
    </div>
  )
}

function MatchCard({ m }) {
  const p = m.profile
  const verified = BADGES.filter(([k]) => p[k])
  return (
    <article className="rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur p-5 space-y-4 transition hover:-translate-y-0.5 hover:border-[#b8f13c]/50">
      <div className="flex items-start gap-4">
        <div className="grid place-items-center w-14 h-14 rounded-full bg-[#b8f13c]/20 text-xl font-bold text-[#b8f13c] shrink-0">
          {p.display_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="vs-display text-xl leading-tight truncate">
            {p.display_name}{p.age ? `, ${p.age}` : ''}
          </h3>
          <p className="text-xs text-[#f2efe6]/60">{p.home_city || 'City not shared'}</p>
          {p.bio && <p className="text-sm text-[#f2efe6]/80 mt-1 line-clamp-2">{p.bio}</p>}
        </div>
        <ScoreRing score={m.score} />
      </div>

      <p className="text-sm text-[#f2efe6]/75">
        <span aria-hidden>📍</span> {m.trip.destination} · {fmt(m.trip.start_date)} to {fmt(m.trip.end_date)}
      </p>

      <div>
        <p className="text-xs uppercase tracking-wider text-[#f2efe6]/50 mb-2">Why you match</p>
        <ul className="flex flex-wrap gap-2">
          {m.reasons.map(r => (
            <li key={r} className="rounded-full bg-[#b8f13c]/15 border border-[#b8f13c]/40 text-[#b8f13c] px-3 py-1 text-xs">{r}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-[#f2efe6]/55">
          {verified.length ? `Verified: ${verified.map(([, l]) => l).join(', ')}` : 'No verification yet'}
        </p>
        <Link to={`/u/${p.id}`}
          className="rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-5 py-2 text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
          View profile
        </Link>
      </div>
    </article>
  )
}

export default function Discover() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: '', data: null })

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function load() {
    setState({ loading: true, error: '', data: null })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/matches/${user.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.detail || `Server error (${res.status})`)
      setState({ loading: false, error: '', data: body })
    } catch (e) {
      const offline = e instanceof TypeError
      setState({ loading: false, data: null,
        error: offline ? 'Cannot reach the matching server. Is uvicorn running on port 8000?' : e.message })
    }
  }

  useEffect(() => { load() }, [user.id])

  const { loading, error, data } = state

  return (
    <div className="vs-root min-h-screen bg-[#0c1f17] text-[#f2efe6]" style={{ colorScheme: 'dark' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Manrope:wght@400;500;600&display=swap');
        .vs-root { font-family: 'Manrope', system-ui, sans-serif; }
        .vs-display { font-family: 'Fraunces', Georgia, serif; font-weight: 700; letter-spacing: -0.015em; }
      `}</style>

      <header className="flex items-center justify-between px-6 sm:px-10 pt-6">
        <span className="vs-display text-2xl">VibeTrip</span>
        <div className="flex items-center gap-5 text-sm">
          <Link to={`/u/${user.id}`} className="text-[#f2efe6]/80 hover:text-[#b8f13c]">My profile</Link>
          <button type="button" onClick={logout}
            className="rounded-full border border-white/25 px-4 py-1.5 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-8 sm:py-10 space-y-6">
        <div>
          <h1 className="vs-display text-3xl sm:text-5xl leading-tight">Your people 🍃</h1>
          {data?.trip ? (
            <p className="text-[#f2efe6]/70 mt-2">
              Travelers heading to <span className="text-[#b8f13c] font-semibold">{data.trip.destination}</span> around{' '}
              {fmt(data.trip.start_date)} to {fmt(data.trip.end_date)}, ranked by how well your vibes fit.
            </p>
          ) : (
            <p className="text-[#f2efe6]/70 mt-2">Travelers going where you're going, ranked by vibe.</p>
          )}
        </div>

        {loading && <p className="text-sm text-white/60">Finding your people...</p>}

        {error && (
          <div role="alert" className="rounded-2xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm flex items-center justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={load} className="rounded-full border border-red-300/50 px-4 py-1.5 hover:bg-red-500/20">Try again</button>
          </div>
        )}

        {data && !data.trip && (
          <p className="text-sm text-white/70">Add a trip with a destination and dates so we can find people going the same way.</p>
        )}

        {data?.trip && !data.matches.length && (
          <div className="rounded-3xl border border-white/15 bg-white/5 p-8 text-center space-y-2">
            <p className="text-3xl" aria-hidden>🧭</p>
            <p className="font-semibold">No matches yet</p>
            <p className="text-sm text-[#f2efe6]/65">
              We look for travelers going to {data.trip.destination} with at least 2 overlapping days. Check back as more people join.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {data?.matches.map(m => <MatchCard key={m.profile.id} m={m} />)}
        </div>
      </main>
    </div>
  )
}