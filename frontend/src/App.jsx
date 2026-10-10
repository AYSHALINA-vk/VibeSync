import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import Landing from './pages/Landing'
import Invitations from './pages/Invitations'

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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" />} />
      <Route path="/" element={<Home />} />
      <Route path="/u/:id" element={<Protected><Profile /></Protected>} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/invitations" element={<Protected><Invitations /></Protected>} />
    </Routes>
    
  )
}