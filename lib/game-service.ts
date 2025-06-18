import { supabase } from './supabase'
import type { Database } from './supabase'

type Game = Database['public']['Tables']['games']['Row']
type GameInsert = Database['public']['Tables']['games']['Insert']
type GameUpdate = Database['public']['Tables']['games']['Update']

export class GameService {
  // Get all games
  async getAllGames() {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get a specific game by ID
  async getGameById(gameId: string) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Create a new game (admin only)
  async createGame(gameData: GameInsert) {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([gameData])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Update a game (admin only)
  async updateGame(gameId: string, gameData: GameUpdate) {
    try {
      const { data, error } = await supabase
        .from('games')
        .update(gameData)
        .eq('id', gameId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Delete a game (admin only)
  async deleteGame(gameId: string) {
    try {
      const { data, error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get games with booking statistics
  async getGamesWithStats() {
    try {
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .order('name', { ascending: true })

      if (gamesError) throw gamesError

      // Get booking counts for each game
      const gamesWithStats = await Promise.all(
        games.map(async (game) => {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, status, total_cost')
            .eq('game_id', game.id)

          if (bookingsError) {
            console.error('Error fetching bookings for game:', game.id, bookingsError)
            return {
              ...game,
              totalBookings: 0,
              confirmedBookings: 0,
              pendingBookings: 0,
              totalRevenue: 0
            }
          }

          const totalBookings = bookings.length
          const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
          const pendingBookings = bookings.filter(b => b.status === 'pending').length
          const totalRevenue = bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + b.total_cost, 0)

          return {
            ...game,
            totalBookings,
            confirmedBookings,
            pendingBookings,
            totalRevenue
          }
        })
      )

      return { data: gamesWithStats, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get available time slots for a game on a specific date
  async getAvailableTimeSlots(gameId: string, date: string) {
    try {
      // Get all bookings for this game on the specified date
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('game_id', gameId)
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed'])
        .order('start_time', { ascending: true })

      if (error) throw error

      // Generate time slots with 30-minute intervals from 6:00 AM to 10:00 PM
      const generateTimeSlots = () => {
        const slots = []
        const startHour = 6 // 6:00 AM
        const endHour = 22 // 10:00 PM

        for (let hour = startHour; hour < endHour; hour++) {
          // Add slots for :00 and :30 minutes
          for (let minute = 0; minute < 60; minute += 30) {
            const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

            // Generate possible end times (1 hour, 1.5 hours, 2 hours, etc.)
            for (let duration = 1; duration <= 4; duration += 0.5) {
              const endHour = hour + Math.floor(duration)
              const endMinute = minute + ((duration % 1) * 60)

              let finalEndHour = endHour
              let finalEndMinute = endMinute

              if (finalEndMinute >= 60) {
                finalEndHour += 1
                finalEndMinute -= 60
              }

              // Don't go beyond 10:00 PM
              if (finalEndHour > 22) break

              const endTime = `${finalEndHour.toString().padStart(2, '0')}:${finalEndMinute.toString().padStart(2, '0')}`

              slots.push({
                start: startTime,
                end: endTime,
                duration: duration
              })
            }
          }
        }

        return slots
      }

      const allPossibleSlots = generateTimeSlots()

      // Filter out slots that conflict with existing bookings
      const availableSlots = allPossibleSlots.filter(slot => {
        return !bookings.some(booking => {
          const bookingStart = booking.start_time
          const bookingEnd = booking.end_time

          // Check if there's any overlap
          return (
            (slot.start >= bookingStart && slot.start < bookingEnd) ||
            (slot.end > bookingStart && slot.end <= bookingEnd) ||
            (slot.start <= bookingStart && slot.end >= bookingEnd)
          )
        })
      })

      return { data: availableSlots, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Search games by name or description
  async searchGames(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get popular games based on booking count
  async getPopularGames(limit: number = 5) {
    try {
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('*')

      if (gamesError) throw gamesError

      // Get booking counts for each game
      const gamesWithBookingCount = await Promise.all(
        games.map(async (game) => {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('game_id', game.id)
            .eq('status', 'confirmed')

          if (bookingsError) {
            console.error('Error fetching bookings for game:', game.id, bookingsError)
            return { ...game, bookingCount: 0 }
          }

          return { ...game, bookingCount: bookings?.length || 0 }
        })
      )

      // Sort by booking count and limit results
      const popularGames = gamesWithBookingCount
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, limit)

      return { data: popularGames, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

export const gameService = new GameService()
