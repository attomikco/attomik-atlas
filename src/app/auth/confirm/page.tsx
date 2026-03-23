'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/')
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    // If no session after 5 seconds, redirect to login
    const timeout = setTimeout(() => {
      router.push('/login')
    }, 5000)

    return () => clearTimeout(timeout)
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
