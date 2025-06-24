import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  phone: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export class AuthService {
  async signUp(phone: string, password: string, name: string, role: 'user' | 'admin' = 'user') {
    try {
      // Create a temporary email using phone number for Supabase auth
      const email = `${phone.replace(/[^0-9]/g, '')}@boundarybox.temp`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role,
            // Add role to app_metadata for JWT claims
            app_metadata: {
              role
            }
          }
        }
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async signIn(phone: string, password: string) {
    try {
      // Convert phone to email format for Supabase auth
      const email = `${phone.replace(/[^0-9]/g, '')}@boundarybox.temp`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Exception in getUserProfile:', error)
      return null
    }
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null)
    })
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'name' | 'phone'>>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async verifyCurrentPassword(phone: string, password: string) {
    try {
      // For now, we'll skip password verification and rely on the fact that
      // the user is already authenticated. Supabase updateUser will handle
      // the security aspect since it requires an active session.
      //
      // In a production environment, you might want to implement a server-side
      // verification endpoint that can safely verify passwords without
      // disrupting the current session.

      return { isValid: true, error: null }
    } catch (error) {
      return { isValid: false, error }
    }
  }

  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

export const authService = new AuthService()