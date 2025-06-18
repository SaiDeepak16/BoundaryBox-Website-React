'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Trophy, Plus, History } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { bookingService } from '@/lib/booking-service'
import { gameService } from '@/lib/game-service'

interface BookingWithGame {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_cost: number
  game: {
    name: string
  }
}

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithGame[]>([])
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch upcoming bookings
        const { data: bookings } = await bookingService.getUpcomingBookings(user.id)
        if (bookings) {
          setUpcomingBookings(bookings as BookingWithGame[])
        }

        // Fetch available games
        const { data: games } = await gameService.getAllGames()
        if (games) {
          setAvailableGames(games)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AuthGuard requireRole="user">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Manage your bookings and explore available games</p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/book">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Plus className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <CardTitle>New Booking</CardTitle>
                  <CardDescription>Book a new slot</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/my-bookings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <CardTitle>My Bookings</CardTitle>
                  <CardDescription>View all bookings</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/history">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <History className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                  <CardTitle>History</CardTitle>
                  <CardDescription>Past bookings</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/games">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Trophy className="h-12 w-12 text-orange-600 mx-auto mb-2" />
                  <CardTitle>Games</CardTitle>
                  <CardDescription>Browse all games</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Upcoming Bookings */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Upcoming Bookings
              </CardTitle>
              <CardDescription>Your next scheduled games</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading bookings...</p>
                </div>
              ) : upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold">{booking.game?.name || 'Unknown Game'}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.booking_date).toLocaleDateString()} • {booking.start_time} - {booking.end_time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                        <span className="font-semibold">₹{booking.total_cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No upcoming bookings</p>
                  <Link href="/book">
                    <Button>Book Your First Slot</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Games */}
          <Card>
            <CardHeader>
              <CardTitle>Available Games</CardTitle>
              <CardDescription>Choose from our selection of games</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading games...</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableGames.map((game) => (
                    <Card key={game.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{game.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <p><strong>Price:</strong> ₹{game.price_per_hour}/hour</p>
                          <p><strong>Max Players:</strong> {game.max_players}</p>
                          <p className="text-gray-600">{game.description}</p>
                        </div>
                        <Link href="/book">
                          <Button className="w-full mt-4" size="sm">
                            Book Now
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}