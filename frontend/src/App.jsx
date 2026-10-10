import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Discover from './pages/Discover'
import Profile from './pages/Profile'

function Protected({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (!profile) return <Navigate to="/onboarding" />
  return children
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">Loading...</div>
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" />} />
      <Route path="/" element={<Protected><Discover /></Protected>} />
      <Route path="/u/:id" element={<Protected><Profile /></Protected>} />
    </Routes>
    
  )
}