'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, MapPin, DollarSign, X, Edit } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { bookingService } from '@/lib/booking-service'
import { useToast } from '@/hooks/use-toast'

interface BookingWithGame {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_cost: number
  notes?: string
  created_at: string
  game: {
    id: string
    name: string
    description: string
    price_per_hour: number
    max_players: number
  }
}

export default function MyBookingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithGame[]>([])
  const [currentBookings, setCurrentBookings] = useState<BookingWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchBookings()
    }
  }, [user])

  const fetchBookings = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Get upcoming bookings
      const { data: upcoming } = await bookingService.getUpcomingBookings(user.id)
      if (upcoming) {
        setUpcomingBookings(upcoming as BookingWithGame[])
      }

      // Get all user bookings to filter current ones
      const { data: allBookings } = await bookingService.getUserBookings(user.id)
      if (allBookings) {
        const today = new Date().toISOString().split('T')[0]
        const current = allBookings.filter((booking: BookingWithGame) => 
          booking.booking_date === today && 
          ['pending', 'confirmed'].includes(booking.status)
        )
        setCurrentBookings(current as BookingWithGame[])
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    try {
      setCancellingId(bookingId)
      
      const { error } = await bookingService.cancelBooking(bookingId, 'Cancelled by user')
      
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking cancelled successfully"
      })

      // Refresh bookings
      fetchBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      })
    } finally {
      setCancellingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canCancelBooking = (booking: BookingWithGame) => {
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`)
    const now = new Date()
    const hoursDifference = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return booking.status === 'pending' || 
           (booking.status === 'confirmed' && hoursDifference > 2) // Can cancel confirmed bookings 2+ hours before
  }

  const BookingCard = ({ booking, showCancelButton = true }: { booking: BookingWithGame, showCancelButton?: boolean }) => (
    <Card key={booking.id} className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{booking.game?.name}</CardTitle>
            <CardDescription>{booking.game?.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date(booking.booking_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            {booking.start_time} - {booking.end_time}
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <DollarSign className="h-4 w-4 mr-2" />
            ₹{booking.total_cost}
          </div>

          {booking.notes && (
            <div className="text-sm text-gray-600">
              <strong>Notes:</strong> {booking.notes}
            </div>
          )}

          <div className="text-xs text-gray-500">
            Booked on: {new Date(booking.created_at).toLocaleDateString()}
          </div>

          {showCancelButton && canCancelBooking(booking) && (
            <div className="flex space-x-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelBooking(booking.id)}
                disabled={cancellingId === booking.id}
              >
                <X className="h-4 w-4 mr-1" />
                {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <AuthGuard requireRole="user">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading your bookings...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireRole="user">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-gray-600">Manage your current and upcoming game bookings</p>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="today">
                Today ({currentBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingBookings.length > 0 ? (
                  upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming bookings</h3>
                    <p className="text-gray-600 mb-4">You don't have any upcoming bookings.</p>
                    <Button asChild>
                      <a href="/book">Book a Game</a>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="today" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {currentBookings.length > 0 ? (
                  currentBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} showCancelButton={false} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings today</h3>
                    <p className="text-gray-600 mb-4">You don't have any bookings scheduled for today.</p>
                    <Button asChild>
                      <a href="/book">Book a Game</a>
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  )
}
