import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Discover = lazy(() => import('./pages/Discover'))
const Profile = lazy(() => import('./pages/Profile'))
const Landing = lazy(() => import('./pages/Landing'))
const Invitations = lazy(() => import('./pages/Invitations'))

function Protected({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (!profile) return <Navigate to="/onboarding" />
  return children
}

function Home() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Protected><Discover /></Protected> : <Landing />
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">Loading...</div>
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0c1f17' }} />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" />} />
        <Route path="/" element={<Home />} />
        <Route path="/u/:id" element={<Protected><Profile /></Protected>} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/invitations" element={<Protected><Invitations /></Protected>} />
      </Routes>
    </Suspense>
  )
}