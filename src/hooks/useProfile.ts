import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { type Profile } from '../types/database'
import { USER_ID } from '../lib/constants'

export interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: string | null
  updateProfile: (data: Partial<Pick<Profile, 'nif' | 'home_office_pct'>>) => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', USER_ID)
        .single()
      if (fetchError) {
        // Profile might not exist yet — create a default one
        if (fetchError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({ id: USER_ID, nif: null, home_office_pct: 20 })
            .select()
            .single()
          if (createError) throw createError
          setProfile(newProfile as Profile)
          return
        }
        throw fetchError
      }
      setProfile(data as Profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const updateProfile = useCallback(async (data: Partial<Pick<Profile, 'nif' | 'home_office_pct'>>) => {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', USER_ID)
    if (updateError) throw updateError
    await fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, updateProfile }
}