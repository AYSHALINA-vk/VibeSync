import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const img = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`
// Hero: put your own photo at frontend/public/hero.jpg and it is used first.
const HERO_SRCS = ['/hero.jpg', img('photo-1464822759023-fed622ff2c3b', 1800)]
const BG_FOREST = img('photo-1448375240586-882707db888b', 1400)
const BG_SNOW = img('photo-1483728642387-6c3bdd6c93e5', 1400)
const BG_OCEAN = img('photo-1507525428034-b723cf961d3e', 1800)

const FEATURES = [
  { icon: '🫂', title: 'Find Your People', text: 'Connect with compatible travelers heading to the same destination on the same dates.',
    src: img('photo-1501785888041-af3ef285b470', 700), fb: 'linear-gradient(160deg,#2f6b3f,#0c1f17)' },
  { icon: '📸', title: 'Share Your Stories', text: 'Showcase travel photos, memorable experiences, and dream destinations.',
    src: img('photo-1488646953014-85cb44e25828', 700), fb: 'linear-gradient(160deg,#5a4a2a,#0a1c33)' },
  { icon: '🛡️', title: 'Travel With Confidence', text: 'Privacy-conscious profiles, traveler safety tools, and transparent booking records.',
    src: img('photo-1441974231531-c6227db76b6e', 700), fb: 'linear-gradient(160deg,#27425a,#0c1f17)' },
]

const STEPS = [
  ['1', 'Create your profile', 'Tell us your pace, budget, and interests.'],
  ['2', 'Discover travelers', 'See people going your way, ranked by vibe.'],
  ['3', 'Form a circle', 'Chat and plan with a small group.'],
  ['4', 'Book with trust', 'Share a booking with a transparent test-escrow demo.'],
]

function Weather() {
  const { leaves, flakes } = useMemo(() => {
    const r = (a, b) => a + Math.random() * (b - a)
    return {
      leaves: Array.from({ length: 14 }, (_, i) => ({
        left: r(0, 46), size: r(14, 26), dur: r(9, 17), delay: -r(0, 17), dx: r(-100, 170), rot: r(240, 720),
        c: ['#b8f13c', '#6fbf3a', '#3f8f3a', '#e0b84a'][i % 4],
      })),
      flakes: Array.from({ length: 40 }, () => ({
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

function FeatureCard({ f }) {
  const [broken, setBroken] = useState(false)
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/15 aspect-[4/5] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#b8f13c]/60 hover:shadow-[0_20px_50px_-20px_rgba(184,241,60,.45)]"
      style={{ background: f.fb }}>
      {!broken && <img src={f.src} alt="" loading="lazy" onError={() => setBroken(true)}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(8,20,16,.95) 15%,rgba(8,20,16,.25) 65%)' }} />
      <div className="absolute bottom-0 p-6 space-y-2">
        <span className="grid place-items-center w-11 h-11 rounded-full bg-[#b8f13c]/20 border border-[#b8f13c]/50 text-xl" aria-hidden>{f.icon}</span>
        <h3 className="vs-display text-2xl leading-tight">{f.title}</h3>
        <p className="text-sm text-[#f2efe6]/80">{f.text}</p>
      </div>
    </article>
  )
}

export default function Landing() {
  const [heroIdx, setHeroIdx] = useState(0)
  const [oceanBroken, setOceanBroken] = useState(false)
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-7 py-3.5 transition hover:scale-[1.02] hover:shadow-[0_14px_40px_-10px_rgba(184,241,60,.6)] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60'
  const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-[#f2efe6] transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]'

  return (
    <div className="vs-root relative min-h-screen bg-[#0c1f17] text-[#f2efe6]" style={{ colorScheme: 'dark' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Manrope:wght@400;500;600&display=swap');
        .vs-root { font-family: 'Manrope', system-ui, sans-serif; }
        .vs-display { font-family: 'Fraunces', Georgia, serif; font-weight: 700; letter-spacing: -0.015em; }
        .vs-quote { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 500; }
        .vs-script { font-family: 'Caveat', cursive; font-weight: 700; }
        html { scroll-behavior: smooth; }
        @keyframes vs-fall { 0% { transform: translate3d(0,-8vh,0) rotate(0); opacity: 0 } 8% { opacity: 1 }
          100% { transform: translate3d(var(--dx),108vh,0) rotate(var(--rot)); opacity: .9 } }
        .vs-fall { animation: vs-fall linear infinite; will-change: transform; }
        @keyframes vs-fade { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .vs-fade { animation: vs-fade 1.1s ease-out both; }
        .vs-fade-2 { animation-delay: .35s; } .vs-fade-3 { animation-delay: .7s; } .vs-fade-4 { animation-delay: 1s; }
        @media (prefers-reduced-motion: reduce) { .vs-fx { display: none } .vs-fade { animation: none } html { scroll-behavior: auto } }
      `}</style>

      {/* scenery: forest left, snow right (fixed, behind everything) */}
      <div aria-hidden className="fixed inset-0 z-0 flex">
        <div className="w-1/2 h-full" style={{ background: 'linear-gradient(160deg,#2f6b3f,#0c1f17)' }}>
          <img src={BG_FOREST} alt="" onError={e => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover" />
        </div>
        <div className="w-1/2 h-full" style={{ background: 'linear-gradient(200deg,#4a6a8a,#0a1c33)' }}>
          <img src={BG_SNOW} alt="" onError={e => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(12,31,23,.5),rgba(12,31,23,.7) 50%,rgba(10,28,51,.55))' }} />
      </div>
      <Weather />

      {/* nav */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 sm:px-10 pt-5">
        <Link to="/" className="vs-display text-2xl">VibeTrip</Link>
        <nav aria-label="Main" className="hidden md:flex gap-7 text-sm text-[#f2efe6]/85">
          <button type="button" onClick={() => scrollTo('features')} className="hover:text-[#b8f13c]">Explore</button>
          <button type="button" onClick={() => scrollTo('how')} className="hover:text-[#b8f13c]">How It Works</button>
          <button type="button" onClick={() => scrollTo('about')} className="hover:text-[#b8f13c]">About</button>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <Link to="/login" className="rounded-full border border-white/30 px-4 py-2 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b8f13c]">Log In</Link>
          <Link to="/login" className="rounded-full bg-[#b8f13c] text-[#0c1f17] font-semibold px-4 py-2 hover:scale-[1.03] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60">Sign Up</Link>
        </div>
      </header>

      <p aria-hidden className="vs-script hidden xl:block fixed z-10 left-[3%] top-[34%] text-3xl leading-tight -rotate-12 w-28 text-[#f2efe6]/90">Same Passion Different Paths</p>
      <p aria-hidden className="vs-script hidden xl:block fixed z-10 right-[3%] top-[22%] text-3xl leading-tight -rotate-12 w-28 text-[#f2efe6]/90">Different Places Same Vibe</p>

      <main className="relative z-10">
        {/* hero */}
        <section className="px-4 pt-10 pb-16 sm:pt-14">
          <div className="relative max-w-[1000px] mx-auto overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] min-h-[560px] flex items-center justify-center text-center"
            style={{ background: 'linear-gradient(160deg,#27425a,#0c1f17)' }}>
            {heroIdx < HERO_SRCS.length && (
              <img src={HERO_SRCS[heroIdx]} alt="A traveler looking toward snow-covered mountains at sunrise"
                onError={() => setHeroIdx(i => i + 1)} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(8,20,16,.92) 5%,rgba(8,20,16,.5) 55%,rgba(8,20,16,.35))' }} />

            <div className="relative px-6 sm:px-14 py-14 space-y-6">
              <h1 className="vs-display vs-fade text-4xl sm:text-6xl leading-[1.05]">
                Find your people.<br />Feel the journey.
              </h1>
              <blockquote className="vs-quote vs-fade vs-fade-2 text-xl sm:text-3xl text-[#b8f13c] max-w-[640px] mx-auto leading-snug">
                “Somewhere between the mountains and the sea, you'll find your people.”
              </blockquote>
              <p className="vs-fade vs-fade-3 text-[#f2efe6]/80 max-w-[560px] mx-auto">
                Discover travelers who share your destinations, interests, and sense of adventure. Your next unforgettable journey might begin with a stranger who feels like a friend.
              </p>
              <div className="vs-fade vs-fade-4 flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link to="/login" className={btnPrimary}>Find My Travel Vibe <span aria-hidden>→</span></Link>
                <button type="button" onClick={() => scrollTo('features')} className={btnGhost}>Explore the Journey <span aria-hidden>↓</span></button>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="px-4 py-16 scroll-mt-6">
          <div className="max-w-[1000px] mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="vs-display text-3xl sm:text-4xl">Travel is better with the right company</h2>
              <p className="text-[#f2efe6]/70">Three reasons travelers choose VibeTrip.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {FEATURES.map(f => <FeatureCard key={f.title} f={f} />)}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="px-4 py-16 scroll-mt-6">
          <div className="max-w-[1000px] mx-auto rounded-[2rem] border border-white/15 bg-[#0c1f17]/65 backdrop-blur-xl p-6 sm:p-10 space-y-8">
            <h2 className="vs-display text-3xl sm:text-4xl text-center">How it works</h2>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map(([n, t, d]) => (
                <li key={n} className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-2">
                  <span className="grid place-items-center w-8 h-8 rounded-full bg-[#b8f13c] text-[#0c1f17] text-sm font-bold">{n}</span>
                  <h3 className="font-semibold">{t}</h3>
                  <p className="text-sm text-[#f2efe6]/70">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* closing */}
        <section id="about" className="px-4 pt-16 pb-24 scroll-mt-6">
          <div className="relative max-w-[1000px] mx-auto overflow-hidden rounded-[2rem] border border-white/15 min-h-[420px] flex items-center justify-center text-center"
            style={{ background: 'linear-gradient(160deg,#0f4c75,#0a1c33)' }}>
            {!oceanBroken && <img src={BG_OCEAN} alt="" loading="lazy" onError={() => setOceanBroken(true)} className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-[#0a1c33]/70" />
            <div className="relative px-6 py-14 space-y-5">
              <figure>
                <blockquote className="vs-quote text-xl sm:text-2xl text-[#f2efe6]/90">“Not all those who wander are lost.”</blockquote>
                <figcaption className="text-sm text-[#f2efe6]/60 mt-1">— J. R. R. Tolkien</figcaption>
              </figure>
              <h2 className="vs-display text-3xl sm:text-5xl leading-tight">Your next adventure starts with a connection.</h2>
              <Link to="/login" className={btnPrimary}>Start Your Journey <span aria-hidden>→</span></Link>
            </div>
          </div>
          <p className="text-center text-xs text-[#f2efe6]/50 mt-8">VibeTrip is a hackathon prototype. Bookings use test funds only.</p>
        </section>
      </main>
    </div>
  )
}