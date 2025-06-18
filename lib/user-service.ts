import { supabase } from './supabase'
import type { Database } from './supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export interface UserStats {
  totalBookings: number
  confirmedBookings: number
  canceledBookings: number
  totalSpent: number
  favoriteGame?: string
}

export class UserService {
  // Get all users (admin only)
  async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get user profile by ID
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, profileData: ProfileUpdate) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<{ data: UserStats | null; error: any }> {
    try {
      // Get all bookings for the user
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          game:games(name)
        `)
        .eq('user_id', userId)

      if (bookingsError) throw bookingsError

      if (!bookings || bookings.length === 0) {
        return {
          data: {
            totalBookings: 0,
            confirmedBookings: 0,
            canceledBookings: 0,
            totalSpent: 0
          },
          error: null
        }
      }

      const totalBookings = bookings.length
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
      const canceledBookings = bookings.filter(b => b.status === 'canceled').length
      const totalSpent = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.total_cost, 0)

      // Find favorite game (most booked game)
      const gameBookingCounts: { [key: string]: { name: string; count: number } } = {}
      
      bookings.forEach(booking => {
        if (booking.game && Array.isArray(booking.game) && booking.game.length > 0) {
          const gameName = booking.game[0].name
          if (gameBookingCounts[gameName]) {
            gameBookingCounts[gameName].count++
          } else {
            gameBookingCounts[gameName] = { name: gameName, count: 1 }
          }
        }
      })

      const favoriteGame = Object.values(gameBookingCounts)
        .sort((a, b) => b.count - a.count)[0]?.name

      return {
        data: {
          totalBookings,
          confirmedBookings,
          canceledBookings,
          totalSpent,
          favoriteGame
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get users with their booking statistics (admin only)
  async getUsersWithStats() {
    try {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const { data: stats } = await this.getUserStats(user.id)
          return {
            ...user,
            stats: stats || {
              totalBookings: 0,
              confirmedBookings: 0,
              canceledBookings: 0,
              totalSpent: 0
            }
          }
        })
      )

      return { data: usersWithStats, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, role: 'user' | 'admin') {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Search users by name or email (admin only)
  async searchUsers(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get user activity (recent bookings)
  async getUserActivity(userId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          game:games(name, description)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get system statistics (admin only)
  async getSystemStats() {
    try {
      // Get total users count
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })

      // Get active users (users with at least one booking in the last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: activeUsers, error: activeUsersError } = await supabase
        .from('bookings')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .then(({ data, error }) => {
          if (error) return { data: null, error }
          const uniqueUsers = new Set(data?.map(b => b.user_id) || [])
          return { data: Array.from(uniqueUsers), error: null }
        })

      // Get admin users count
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'admin')

      if (usersError || activeUsersError.error || adminError) {
        throw new Error('Error fetching system statistics')
      }

      return {
        data: {
          totalUsers: users?.length || 0,
          activeUsers: activeUsers.data?.length || 0,
          adminUsers: adminUsers?.length || 0,
          regularUsers: (users?.length || 0) - (adminUsers?.length || 0)
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
  }
  // Get all users with stats (admin only)
  async getAllUsersWithStats() {
    try {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get booking stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('total_cost, booking_date, status')
            .eq('user_id', user.id)

          const totalBookings = bookings?.length || 0
          const totalSpent = bookings?.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.total_cost, 0) || 0
          const lastBooking = bookings?.length > 0 ? bookings.sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())[0].booking_date : null

          return {
            ...user,
            totalBookings,
            totalSpent,
            lastBooking
          }
        })
      )

      return { data: usersWithStats, error: null }
    } catch (error) {
      console.error('Error fetching users with stats:', error)
      return { data: null, error }
    }
  }
}

export const userService = new UserService()
