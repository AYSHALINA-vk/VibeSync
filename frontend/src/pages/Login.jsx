import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit() {
    setError('')
    const fn = isSignup ? supabase.auth.signUp : supabase.auth.signInWithPassword
    const { error } = await fn.call(supabase.auth, { email, password })
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-sky-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 space-y-4">
        <h1 className="text-3xl font-bold">VibeTrip 🌍</h1>
        <p className="text-gray-500">Find your people. Plan together.</p>
        <input className="w-full border rounded-lg p-2" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border rounded-lg p-2" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button onClick={handleSubmit}
          className="w-full bg-teal-600 text-white rounded-lg p-2 font-medium">
          {isSignup ? 'Create account' : 'Log in'}
        </button>
        <button onClick={() => setIsSignup(!isSignup)} className="text-sm text-teal-700">
          {isSignup ? 'Have an account? Log in' : 'New here? Sign up'}
        </button>
      </div>
    </div>
  )
}