import { supabase } from './supabase'
import type { Database } from './supabase'

type Booking = Database['public']['Tables']['bookings']['Row']
type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export interface BookingWithDetails extends Booking {
  game: {
    id: string
    name: string
    description: string
    price_per_hour: number
    max_players: number
  }
  profile: {
    id: string
    name: string
    email: string
  }
}

export class BookingService {
  // Create a new booking
  async createBooking(bookingData: BookingInsert) {
    try {
      // First check for conflicts
      const hasConflict = await this.checkBookingConflict(
        bookingData.game_id,
        bookingData.booking_date,
        bookingData.start_time,
        bookingData.end_time
      )

      if (hasConflict) {
        throw new Error('Time slot is already booked')
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select(`
          *,
          game:games(*),
          profile:profiles(*)
        `)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get bookings for a specific user
  async getUserBookings(userId: string, status?: string) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          game:games(*),
          profile:profiles(*)
        `)
        .eq('user_id', userId)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get all bookings (admin only)
  async getAllBookings(status?: string) {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          game:games(*),
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId: string, status: string, notes?: string) {
    try {
      const updateData: BookingUpdate = { status }
      if (notes !== undefined) {
        updateData.notes = notes
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select(`
          *,
          game:games(*),
          profile:profiles(*)
        `)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Cancel a booking
  async cancelBooking(bookingId: string, reason?: string) {
    return this.updateBookingStatus(bookingId, 'canceled', reason)
  }

  // Confirm a booking
  async confirmBooking(bookingId: string) {
    return this.updateBookingStatus(bookingId, 'confirmed')
  }

  // Check for booking conflicts
  async checkBookingConflict(
    gameId: string,
    bookingDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) {
    try {
      const { data, error } = await supabase.rpc('check_booking_conflict', {
        p_game_id: gameId,
        p_booking_date: bookingDate,
        p_start_time: startTime,
        p_end_time: endTime,
        p_exclude_booking_id: excludeBookingId || null
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error checking booking conflict:', error)
      return false
    }
  }

  // Calculate booking cost
  async calculateBookingCost(gameId: string, startTime: string, endTime: string) {
    try {
      const { data, error } = await supabase.rpc('calculate_booking_cost', {
        p_game_id: gameId,
        p_start_time: startTime,
        p_end_time: endTime
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get booking statistics
  async getBookingStats() {
    try {
      const { data: totalBookings, error: totalError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })

      const { data: pendingBookings, error: pendingError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')

      const { data: confirmedBookings, error: confirmedError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'confirmed')

      const { data: revenueData, error: revenueError } = await supabase
        .from('bookings')
        .select('total_cost')
        .eq('status', 'confirmed')

      if (totalError || pendingError || confirmedError || revenueError) {
        throw new Error('Error fetching booking statistics')
      }

      const totalRevenue = revenueData?.reduce((sum, booking) => sum + booking.total_cost, 0) || 0

      return {
        data: {
          totalBookings: totalBookings?.length || 0,
          pendingBookings: pendingBookings?.length || 0,
          confirmedBookings: confirmedBookings?.length || 0,
          totalRevenue
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get upcoming bookings for a user
  async getUpcomingBookings(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          game:games(*)
        `)
        .eq('user_id', userId)
        .gte('booking_date', today)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get booking history for a user
  async getBookingHistory(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          game:games(*)
        `)
        .eq('user_id', userId)
        .lt('booking_date', today)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

export const bookingService = new BookingService()
