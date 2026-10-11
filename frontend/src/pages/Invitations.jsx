import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const serif = { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700 }
const btn = 'rounded-full px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c] disabled:opacity-50'

function Avatar({ p }) {
  return p?.avatar_url
    ? <img src={p.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
    : <div className="grid place-items-center w-14 h-14 rounded-full bg-[#b8f13c]/20 text-xl font-bold text-[#b8f13c] shrink-0">{p?.display_name?.[0]?.toUpperCase() || '?'}</div>
}

export default function Invitations() {
  const { user } = useAuth()
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [people, setPeople] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')
  const [match, setMatch] = useState(null)   // person to celebrate with

  const load = useCallback(async () => {
    // row level security only returns invitations that involve me
    const { data, error } = await supabase.from('travel_invitations').select('*')
      .eq('status', 'pending').order('created_at', { ascending: false })
    if (error) { setMsg(error.message); return setLoading(false) }
    const ids = [...new Set(data.map(i => (i.sender_id === user.id ? i.receiver_id : i.sender_id)))]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, display_name, avatar_url, home_city').in('id', ids)
      setPeople(Object.fromEntries((ps || []).map(p => [p.id, p])))
    }
    setReceived(data.filter(i => i.receiver_id === user.id))
    setSent(data.filter(i => i.sender_id === user.id))
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    load()
    const ch = supabase.channel('invitations-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'travel_invitations' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, user.id])

  async function respond(inv, action) {
    setMsg(''); setBusyId(inv.id)
    // the database decides whether this user is allowed to do this
    const { error } = await supabase.rpc('respond_invitation', { p_id: inv.id, p_action: action })
    setBusyId(null)
    if (error) setMsg(error.message)
    else if (action === 'accept') setMatch(people[inv.sender_id] || { id: inv.sender_id, display_name: 'your new travel buddy' })
    load()
  }

  return (
    <div className="min-h-screen px-4 py-10 text-[#f2efe6]" style={{ colorScheme: 'dark', background: 'linear-gradient(160deg,#0c1f17 40%,#0a1c33)' }}>
      <div className="max-w-3xl mx-auto space-y-8">
        <Link to="/" className="text-sm text-[#b8f13c]">Back to matches</Link>
        <div>
          <h1 className="text-4xl" style={serif}>Travel invitations</h1>
          <p className="text-[#f2efe6]/70 mt-1">People who want to explore with you.</p>
        </div>

        {msg && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{msg}</p>}
        {loading && <p className="text-white/60">Loading invitations...</p>}

        {!loading && !received.length && (
          <div className="rounded-3xl border border-white/15 bg-white/5 p-8 text-center space-y-1">
            <p className="text-3xl" aria-hidden>💌</p>
            <p className="font-semibold">No invitations waiting</p>
            <p className="text-sm text-[#f2efe6]/65">When someone shows interest in your trip, it appears here.</p>
          </div>
        )}

        <div className="space-y-4">
          {received.map(inv => {
            const p = people[inv.sender_id]
            return (
              <article key={inv.id} className="rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar p={p} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl leading-tight" style={serif}>{p?.display_name || 'A traveler'}</h2>
                    <p className="text-sm text-[#f2efe6]/65">📍 {inv.destination} · {inv.overlap_days} days overlap</p>
                  </div>
                  <span className="rounded-full bg-[#b8f13c] text-[#0c1f17] text-sm font-semibold px-3 py-1">{inv.score ?? 0}%</span>
                </div>
                {inv.message && <p className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-[#f2efe6]/85">“{inv.message}”</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busyId === inv.id} onClick={() => respond(inv, 'accept')}
                    className={`${btn} bg-[#b8f13c] text-[#0c1f17] hover:scale-[1.03]`}>Accept</button>
                  <button type="button" disabled={busyId === inv.id} onClick={() => respond(inv, 'decline')}
                    className={`${btn} border border-white/25 hover:bg-white/10`}>Decline</button>
                  <Link to={`/u/${inv.sender_id}`} className={`${btn} border border-white/25 hover:bg-white/10`}>View profile</Link>
                </div>
              </article>
            )
          })}
        </div>

        {!!sent.length && (
          <section className="space-y-3">
            <h2 className="text-2xl" style={serif}>Invitations you sent</h2>
            {sent.map(inv => (
              <article key={inv.id} className="rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-semibold">{people[inv.receiver_id]?.display_name || 'A traveler'}</span>
                  <span className="text-[#f2efe6]/60"> · {inv.destination} · waiting for a reply</span>
                </p>
                <button type="button" disabled={busyId === inv.id} onClick={() => respond(inv, 'cancel')}
                  className={`${btn} border border-white/25 hover:bg-white/10`}>Cancel</button>
              </article>
            ))}
          </section>
        )}
      </div>

      {match && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/65 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setMatch(null)}>
          <style>{`@keyframes vs-pop { from { opacity: 0; transform: translateY(16px) scale(.96) } to { opacity: 1; transform: none } }`}</style>
          <div role="dialog" aria-modal="true" aria-labelledby="match-title"
            className="w-full max-w-md rounded-[2rem] border border-[#b8f13c]/40 bg-[#0c1f17]/95 p-8 text-center space-y-4 shadow-[0_30px_80px_-20px_rgba(184,241,60,.35)]"
            style={{ animation: 'vs-pop .35s ease-out' }}>
            <p className="text-5xl" aria-hidden>🎉</p>
            <h2 id="match-title" className="text-3xl" style={serif}>It's a Vibe Match!</h2>
            <p className="text-[#f2efe6]/80">Different paths, same destination. Your adventure starts here!</p>
            <p className="text-sm text-[#b8f13c]">You and {match.display_name} are now connected.</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link to={`/chat/${match.id}`} className={`${btn} bg-[#b8f13c] text-[#0c1f17]`}>Say hello</Link>
              <button type="button" onClick={() => setMatch(null)} className={`${btn} border border-white/25 hover:bg-white/10`}>Later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
