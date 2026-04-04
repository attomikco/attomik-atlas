'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

    // With implicit flow, Supabase client auto-detects tokens in the URL hash
    // and sets the session. We just listen for it.
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
      } else {
        router.push('/')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        claimAndRedirect(session)
      }
    })

    // Also check if session is already set
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        claimAndRedirect(session)
      }
    })

    // Timeout fallback
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
