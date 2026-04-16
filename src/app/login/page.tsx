'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const [isLocalhost, setIsLocalhost] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const search = window.location.search
    const hash = window.location.hash

    setDebug(`Search: ${search || '(none)'} | Hash: ${hash || '(none)'}`)

    // If there's a code param, Supabase client with detectSessionInUrl
    // will auto-exchange it. Show loading state.
    if (search.includes('code=')) {
      setAuthenticating(true)
    }

    // Check for error in hash
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const errorDesc = params.get('error_description')
      const errorCode = params.get('error_code')
      if (errorDesc) {
        setError(`${errorCode || 'error'}: ${errorDesc.replace(/\+/g, ' ')}`)
      }
    }

    async function claimAndRedirect(session: { user: { id: string; email?: string } }) {
      const brandId = sessionStorage.getItem('attomik_demo_brand_id')
      const campaignId = sessionStorage.getItem('attomik_demo_campaign_id')
      if (brandId) {
        const update: Record<string, string> = {}
        if (session.user.email) update.client_email = session.user.email
        update.user_id = session.user.id
        await supabase.from('brands').update(update).eq('id', brandId)
      }
      sessionStorage.removeItem('attomik_demo_brand_id')
      sessionStorage.removeItem('attomik_demo_campaign_id')
      if (campaignId) {
        window.location.href = `/preview/${campaignId}`
      } else {
        window.location.href = new URLSearchParams(window.location.search).get('next') || '/dashboard'
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        claimAndRedirect(session)
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        claimAndRedirect(session)
      }
    })

    // Also check current session (might already be set by detectSessionInUrl)
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (session) {
        claimAndRedirect(session)
      } else if (search.includes('code=') && sessionError) {
        setAuthenticating(false)
        setError(sessionError.message)
      } else if (search.includes('code=')) {
        // Code is present but no session yet — wait for onAuthStateChange
        // If it takes too long, show error
        setTimeout(() => {
          setAuthenticating(false)
          setError('Login failed — the link may have expired. Please request a new one.')
        }, 5000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleDevLogin() {
    if (!email.trim() || !password.trim()) { setError('Enter email and password'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) { setError(signInErr.message); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tighter">Attomik</h1>
          <p className="text-muted text-sm mt-1">Atlas</p>
        </div>

        <div className="card bg-paper border border-border rounded-card p-8">
          {authenticating ? (
            <div className="text-center py-4">
              <p className="text-muted text-sm">Signing you in...</p>
            </div>
          ) : sent ? (
            <div className="text-center">
              <h2 className="text-lg font-bold mb-2">Check your email</h2>
              <p className="text-muted text-sm">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
              <button
                onClick={() => { setSent(false); setError('') }}
                className="mt-4 text-muted text-sm hover:text-ink transition-colors"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="form-label label block mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
              />

              {isLocalhost && (
                <>
                  <label className="form-label label block mb-2 mt-3">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
                  />
                </>
              )}

              {error && (
                <p className="text-danger text-sm mt-2">{error}</p>
              )}

              {isLocalhost ? (
                <button
                  type="button"
                  onClick={handleDevLogin}
                  disabled={loading}
                  className="btn btn-dark w-full mt-4 bg-ink text-accent font-semibold rounded-btn px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-dark w-full mt-4 bg-ink text-accent font-semibold rounded-btn px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
              )}
            </form>
          )}
        </div>

        {debug && (
          <pre className="mt-4 p-3 bg-paper border border-border rounded-btn text-xs text-muted break-all whitespace-pre-wrap">
            {debug}
          </pre>
        )}
      </div>
    </div>
  )
}
