'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, DollarSign, Search, Filter, User, CheckCircle, XCircle, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookingService } from '@/lib/booking-service'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface BookingWithDetails {
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
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
}

export default function AdminBookingsPage() {
  const { toast } = useToast()
  
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAllBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter, dateFilter])

  const fetchAllBookings = async () => {
    try {
      setLoading(true)
      
      const { data } = await bookingService.getAllBookings()
      if (data) {
        setBookings(data as BookingWithDetails[])
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

  const filterBookings = () => {
    let filtered = [...bookings]
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.game?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date)
        bookingDate.setHours(0, 0, 0, 0)
        
        switch (dateFilter) {
          case 'today':
            return bookingDate.getTime() === today.getTime()
          case 'upcoming':
            return bookingDate >= today
          case 'past':
            return bookingDate < today
          case 'this_week':
            const weekFromNow = new Date(today)
            weekFromNow.setDate(today.getDate() + 7)
            return bookingDate >= today && bookingDate <= weekFromNow
          default:
            return true
        }
      })
    }

    // Sort by booking date (newest first)
    filtered.sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())

    setFilteredBookings(filtered)
  }

  const handleApproveBooking = async (bookingId: string) => {
    try {
      setProcessingId(bookingId)
      
      const { error } = await bookingService.confirmBooking(bookingId)
      if (error) {
        throw error
      }
      
      toast({
        title: "Success",
        description: "Booking approved successfully"
      })
      
      fetchAllBookings()
    } catch (error) {
      console.error('Error approving booking:', error)
      toast({
        title: "Error",
        description: "Failed to approve booking",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectBooking = async (bookingId: string) => {
    try {
      setProcessingId(bookingId)

      const { error } = await bookingService.cancelBooking(bookingId, 'Rejected by admin')
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking rejected successfully"
      })

      fetchAllBookings()
    } catch (error) {
      console.error('Error rejecting booking:', error)
      toast({
        title: "Error",
        description: "Failed to reject booking",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkNoShow = async (bookingId: string) => {
    try {
      setProcessingId(bookingId)

      const { error } = await bookingService.markNoShow(bookingId)
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking marked as no-show"
      })

      fetchAllBookings()
    } catch (error) {
      console.error('Error marking no-show:', error)
      toast({
        title: "Error",
        description: "Failed to mark as no-show",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkCompleted = async (bookingId: string) => {
    try {
      setProcessingId(bookingId)

      const { error } = await bookingService.markCompleted(bookingId)
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking marked as completed"
      })

      fetchAllBookings()
    } catch (error) {
      console.error('Error marking completed:', error)
      toast({
        title: "Error",
        description: "Failed to mark as completed",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleAdminCancel = async (bookingId: string) => {
    try {
      setProcessingId(bookingId)

      const { error } = await bookingService.adminCancelBooking(bookingId)
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking cancelled successfully"
      })

      fetchAllBookings()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      })
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'canceled':
        return 'bg-red-100 text-red-800'
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getBookingStats = () => {
    const total = filteredBookings.length
    const pending = filteredBookings.filter(b => b.status === 'pending').length
    const confirmed = filteredBookings.filter(b => b.status === 'confirmed').length
    const revenue = filteredBookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.total_cost, 0)
    
    return { total, pending, confirmed, revenue }
  }

  if (loading) {
    return (
      <AuthGuard requireRole="admin">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading bookings...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const stats = getBookingStats()

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">All Bookings Management</h1>
                <p className="text-gray-600">Manage and monitor all game bookings</p>
              </div>
              <Link href="/admin">
                <Button variant="outline">
                  ← Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.revenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setDateFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-semibold">{booking.game?.name}</h3>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                          {new Date(booking.booking_date) >= new Date(new Date().toDateString()) && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Upcoming
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            <div>
                              <p className="font-medium">{booking.user?.name}</p>
                              <p className="text-xs">{booking.user?.phone}</p>
                              <p className="text-xs text-gray-500">{booking.user?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {booking.start_time} - {booking.end_time}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            ₹{booking.total_cost}
                          </div>
                        </div>

                        {booking.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>Notes:</strong> {booking.notes}
                          </p>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          Booked: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4 lg:mt-0 lg:ml-6">
                        {booking.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveBooking(booking.id)}
                              disabled={processingId === booking.id}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {processingId === booking.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectBooking(booking.id)}
                              disabled={processingId === booking.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        {booking.status === 'confirmed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                              onClick={() => handleMarkCompleted(booking.id)}
                              disabled={processingId === booking.id}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Completed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-gray-600 border-gray-600 hover:bg-gray-50"
                              onClick={() => handleMarkNoShow(booking.id)}
                              disabled={processingId === booking.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Mark No-Show
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAdminCancel(booking.id)}
                              disabled={processingId === booking.id}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}

                        {(booking.status === 'canceled' || booking.status === 'no_show' || booking.status === 'completed') && (
                          <div className="text-sm text-gray-500 py-2">
                            {booking.status === 'completed' && 'Booking completed'}
                            {booking.status === 'canceled' && 'Booking cancelled - slot available'}
                            {booking.status === 'no_show' && 'No-show - slot available'}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                      ? 'No bookings match your current filters.'
                      : 'No bookings have been made yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
