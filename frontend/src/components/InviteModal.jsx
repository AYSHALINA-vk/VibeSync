import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const serif = { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700 }

export default function InviteModal({ match, onClose, onSent }) {
  const p = match.profile
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const box = useRef(null)

  useEffect(() => {
    box.current?.focus()
    const onKey = e => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [busy, onClose])

  async function send() {
    setError('')
    if (!match.trip?.id) return setError('This match has no trip id, so the invitation cannot be sent.')
    setBusy(true)
    // the database validates everything: sender, dates, blocks, duplicates
    const { error } = await supabase.rpc('send_invitation', {
      p_receiver: p.id, p_trip: match.trip.id, p_message: message.trim() || null, p_score: match.score,
    })
    setBusy(false)
    if (error) return setError(error.message)
    onSent(p)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <style>{`@keyframes vs-pop { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }`}</style>
      <div role="dialog" aria-modal="true" aria-labelledby="invite-title"
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/15 bg-[#0c1f17]/90 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] p-6 sm:p-8 space-y-5 text-[#f2efe6]"
        style={{ animation: 'vs-pop .3s ease-out' }}>
        <div className="space-y-1">
          <p className="text-sm text-[#b8f13c]">💚 Show interest</p>
          <h2 id="invite-title" className="text-3xl leading-tight" style={serif}>{p.display_name}</h2>
        </div>

        <ul className="flex flex-wrap gap-2 text-sm">
          <li className="rounded-full border border-white/20 px-3 py-1">📍 {match.trip.destination}</li>
          <li className="rounded-full border border-white/20 px-3 py-1">🗓️ {fmt(match.trip.start_date)} to {fmt(match.trip.end_date)}</li>
          <li className="rounded-full border border-white/20 px-3 py-1">{match.overlap_days} days overlap</li>
          <li className="rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-3 py-1">{match.score}% compatible</li>
        </ul>

        {!!match.reasons?.length && (
          <p className="text-sm text-[#f2efe6]/70">{match.reasons.slice(0, 3).join(' · ')}</p>
        )}

        <label className="block text-sm text-[#f2efe6]/70 space-y-1.5">
          Say hello (optional)
          <textarea ref={box} rows="4" maxLength={300} value={message} onChange={e => setMessage(e.target.value)}
            placeholder={`Hi ${p.display_name?.split(' ')[0] || ''}, I'm heading there too. Want to explore together?`}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[#f2efe6] placeholder-[#f2efe6]/40 focus:outline-none focus:border-[#b8f13c] focus:ring-2 focus:ring-[#b8f13c]/30" />
          <span className="block text-right text-xs text-white/45">{message.length}/300</span>
        </label>

        {error && <p role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={busy}
            className="rounded-full border border-white/25 px-6 py-3 hover:bg-white/10 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]">Cancel</button>
          <button type="button" onClick={send} disabled={busy}
            className="flex-1 rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold py-3 transition hover:scale-[1.01] hover:shadow-[0_14px_40px_-10px_rgba(184,241,60,.6)] disabled:opacity-60 disabled:hover:scale-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">
            {busy ? 'Sending...' : 'Send invitation'}
          </button>
        </div>
      </div>
    </div>
  )
}
