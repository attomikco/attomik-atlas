'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Show error from hash fragments (Supabase error redirects)
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const errorDesc = params.get('error_description')
      if (errorDesc) {
        setError(errorDesc.replace(/\+/g, ' '))
      }
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname)
    }

    // If already logged in, redirect
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [router])

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
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tighter">Attomik</h1>
          <p className="text-muted text-sm mt-1">Marketing OS</p>
        </div>

        <div className="bg-paper border border-border rounded-card p-8">
          {sent ? (
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
      </div>
    </div>
  )
}
