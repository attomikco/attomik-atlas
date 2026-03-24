'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Account created! You can now sign in.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tighter">Attomik</h1>
          <p className="text-muted text-sm mt-1">Marketing OS</p>
        </div>

        <div className="bg-paper border border-border rounded-card p-8">
          <form onSubmit={handleSubmit}>
            <label className="label block mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
            />

            <label className="label block mb-2 mt-4">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
            />

            {error && (
              <p className="text-danger text-sm mt-2">{error}</p>
            )}
            {message && (
              <p className="text-success text-sm mt-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-ink text-accent font-semibold rounded-btn px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }}
            className="w-full mt-3 text-muted text-sm hover:text-ink transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
