'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// localStorage key written by EmailGateModal before firing auth. Existence
// here means the user was mid-wizard when they were sent to Google / email —
// route them back to /onboarding?resume=1 so the wizard can rehydrate and
// auto-continue instead of dumping them on an empty dashboard.
const RESUME_KEY = 'attomik_pending_wizard'
const RESUME_TTL_MS = 60 * 60 * 1000 // 1 hour

function hasPendingWizard(): boolean {
  try {
    const raw = localStorage.getItem(RESUME_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const savedAt = typeof parsed?.savedAt === 'number' ? parsed.savedAt : 0
    if (!savedAt || Date.now() - savedAt > RESUME_TTL_MS) {
      localStorage.removeItem(RESUME_KEY)
      return false
    }
    return !!parsed?.state
  } catch {
    return false
  }
}

export default function AuthConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // Check for errors in hash
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const errorDesc = params.get('error_description')
      if (errorDesc) {
        router.push(`/login?error=${encodeURIComponent(errorDesc.replace(/\+/g, ' '))}`)
        return
      }
    }

    async function claimAndRedirect(session: { user: { id: string; email?: string } }) {
      const brandId = sessionStorage.getItem('attomik_demo_brand_id')
      const campaignId = sessionStorage.getItem('attomik_demo_campaign_id')
      if (brandId) {
        // Claim brand — set both user_id and client_email for compatibility
        const update: Record<string, string> = {}
        if (session.user.email) update.client_email = session.user.email
        update.user_id = session.user.id
        await supabase.from('brands').update(update).eq('id', brandId)
      }
      sessionStorage.removeItem('attomik_demo_brand_id')
      sessionStorage.removeItem('attomik_demo_campaign_id')
      if (campaignId) {
        router.push(`/preview/${campaignId}`)
        return
      }
      // No preview in flight, but the user may have been mid-wizard when we
      // sent them through auth. Resume the wizard if a snapshot is waiting;
      // otherwise fall through to the dashboard.
      if (hasPendingWizard()) {
        router.push('/onboarding?resume=1')
        return
      }
      router.push('/dashboard')
    }

    // Session should already be set by the server-side code exchange
    // in /auth/callback. Just check for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        claimAndRedirect(session)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        claimAndRedirect(session)
      }
    })

    // Timeout fallback — if session not detected after 8s, redirect to login
    const timeout = setTimeout(() => {
      router.push('/login?error=' + encodeURIComponent('Login failed. Please try again.'))
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">Signing you in...</h2>
        <p className="text-muted text-sm">Please wait.</p>
      </div>
    </div>
  )
}
