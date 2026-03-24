'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')
  const supabase = createClient()
  const router = useRouter()

  // Handle implicit flow — token arrives as URL fragment (#access_token=...)
  useEffect(() => {
    const fullUrl = window.location.href
    const hash = window.location.hash
    const search = window.location.search

    // Capture debug info
    setDebug(`URL: ${fullUrl}\nHash: ${hash || '(none)'}\nSearch: ${search || '(none)'}`)

    if (!hash.includes('access_token')) {
      // Check for error in hash
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', ''))
        const errorDesc = params.get('error_description')
        const errorCode = params.get('error_code')
        if (errorDesc) {
          setError(`${errorCode || 'error'}: ${errorDesc.replace(/\+/g, ' ')}`)
        }
      }
      return
    }

    setAuthenticating(true)
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
        if (!error && data.user) {
          window.location.href = '/'
        } else {
          setAuthenticating(false)
          setError(error?.message || 'Authentication failed')
        }
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/login`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
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
              <label className="label block mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full border border-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
              />

              {error && (
                <p className="text-danger text-sm mt-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-ink text-accent font-semibold rounded-btn px-4 py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
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
