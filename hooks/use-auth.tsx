'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { User } from '@supabase/supabase-js'
import { authService, Profile } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, name: string, role?: 'user' | 'admin') => Promise<any>
  signOut: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      try {
        const user = await authService.getCurrentUser()
        setUser(user)

        if (user) {
          const profile = await authService.getUserProfile(user.id)
          setProfile(profile)
        }
      } catch (error) {
        console.error('Error getting initial user:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      try {
        setUser(user)

        if (user) {
          const profile = await authService.getUserProfile(user.id)
          setProfile(profile)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error('Error in auth state change:', error)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn(email, password)
    return result
  }

  const signUp = async (email: string, password: string, name: string, role: 'user' | 'admin' = 'user') => {
    const result = await authService.signUp(email, password, name, role)
    return result
  }

  const signOut = async () => {
    const result = await authService.signOut()
    if (!result.error) {
      setUser(null)
      setProfile(null)
    }
    return result
  }

  const contextValue: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}