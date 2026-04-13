'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ProfileRow = {
  id: string
  full_name: string | null
  job_title: string | null
}

type AuthUser = { id: string; email: string | null }

type ProfileContextType = {
  loading: boolean
  user: AuthUser | null
  profile: ProfileRow | null
  refresh: () => Promise<void>
  updateProfile: (
    patch: Partial<Pick<ProfileRow, 'full_name' | 'job_title'>>
  ) => Promise<{ error: string | null }>
}

const ProfileContext = createContext<ProfileContextType>({
  loading: true,
  user: null,
  profile: null,
  refresh: async () => {},
  updateProfile: async () => ({ error: null }),
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }
    setUser({ id: authUser.id, email: authUser.email ?? null })
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, job_title')
      .eq('id', authUser.id)
      .maybeSingle()
    setProfile(data || { id: authUser.id, full_name: null, job_title: null })
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<ProfileRow, 'full_name' | 'job_title'>>) => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return { error: 'Not signed in' }
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .select('id, full_name, job_title')
        .single()
      if (error) return { error: error.message }
      if (data) setProfile(data)
      return { error: null }
    },
    []
  )

  return (
    <ProfileContext.Provider value={{ loading, user, profile, refresh, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
