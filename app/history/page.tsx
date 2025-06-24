'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Calendar, Clock, DollarSign, Search, Filter, Star } from 'lucide-react'
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

export default function HistoryPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [bookings, setBookings] = useState<BookingWithGame[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingWithGame[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [gameFilter, setGameFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchBookingHistory()
    }
  }, [user])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter, gameFilter, dateFilter])

  const fetchBookingHistory = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Get all user bookings (both past and upcoming)
      const { data } = await bookingService.getUserBookings(user.id)
      if (data) {
        setBookings(data as BookingWithGame[])
      }
    } catch (error) {
      console.error('Error fetching booking history:', error)
      toast({
        title: "Error",
        description: "Failed to load booking history",
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
        booking.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter)
    }

    // Game filter
    if (gameFilter !== 'all') {
      filtered = filtered.filter(booking => booking.game?.name === gameFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date)
        bookingDate.setHours(0, 0, 0, 0)

        switch (dateFilter) {
          case 'upcoming':
            return bookingDate >= today
          case 'past':
            return bookingDate < today
          case 'today':
            return bookingDate.getTime() === today.getTime()
          case 'this_week':
            const weekFromNow = new Date(today)
            weekFromNow.setDate(today.getDate() + 7)
            return bookingDate >= today && bookingDate <= weekFromNow
          case 'this_month':
            const monthFromNow = new Date(today)
            monthFromNow.setMonth(today.getMonth() + 1)
            return bookingDate >= today && bookingDate <= monthFromNow
          default:
            return true
        }
      })
    }

    // Sort by booking date (newest first)
    filtered.sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())

    setFilteredBookings(filtered)
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

  const getUniqueGames = () => {
    const games = bookings.map(booking => booking.game?.name).filter(Boolean)
    return Array.from(new Set(games))
  }

  const calculateTotalSpent = () => {
    return filteredBookings
      .filter(booking => booking.status === 'confirmed')
      .reduce((total, booking) => total + booking.total_cost, 0)
  }

  const getBookingStats = () => {
    const total = filteredBookings.length
    const pending = filteredBookings.filter(b => b.status === 'pending').length
    const confirmed = filteredBookings.filter(b => b.status === 'confirmed').length
    const completed = filteredBookings.filter(b => b.status === 'completed').length
    const canceled = filteredBookings.filter(b => b.status === 'canceled').length
    const noShow = filteredBookings.filter(b => b.status === 'no_show').length

    return { total, pending, confirmed, completed, canceled, noShow }
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setGameFilter('all')
    setDateFilter('all')
    setIsFilterOpen(false)
  }

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || gameFilter !== 'all' || dateFilter !== 'all'

  if (loading) {
    return (
      <AuthGuard requireRole="user">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading your booking history...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const stats = getBookingStats()

  return (
    <AuthGuard requireRole="user">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">All Bookings</h1>
            <p className="text-gray-600">View and manage all your game bookings - past, present, and future</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <Star className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-600">Confirmed</p>
                  <p className="text-xl font-bold text-gray-900">{stats.confirmed}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <DollarSign className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-600">Total Spent</p>
                  <p className="text-xl font-bold text-gray-900">₹{calculateTotalSpent()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <Filter className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-600">Showing</p>
                  <p className="text-xl font-bold text-gray-900">{filteredBookings.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Filter Button */}
          <div className="md:hidden mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {filteredBookings.length} bookings found
              </div>

              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-600 rounded-full"></span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center">
                      <Filter className="h-5 w-5 mr-2" />
                      Filters & Search
                    </SheetTitle>
                    <SheetDescription>
                      Filter your booking history to find specific bookings
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* Search */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Search Bookings</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by game or notes..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by date" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="this_week">This Week</SelectItem>
                          <SelectItem value="this_month">This Month</SelectItem>
                          <SelectItem value="past">Past</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Booking Status</label>
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
                    </div>

                    {/* Game Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Game Type</label>
                      <Select value={gameFilter} onValueChange={setGameFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by game" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Games</SelectItem>
                          {getUniqueGames().map((game) => (
                            <SelectItem key={game} value={game}>{game}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={clearAllFilters}
                        className="flex-1"
                        disabled={!hasActiveFilters}
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={() => setIsFilterOpen(false)}
                        className="flex-1"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Desktop Filters */}
          <Card className="mb-6 hidden md:block">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters & Search
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by game or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>

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

                <Select value={gameFilter} onValueChange={setGameFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games</SelectItem>
                    {getUniqueGames().map((game) => (
                      <SelectItem key={game} value={game}>{game}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold">{booking.game?.name}</h3>
                          <div className="flex space-x-2">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                            {new Date(booking.booking_date) >= new Date(new Date().toDateString()) && (
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                Upcoming
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
                      </div>

                      <div className="mt-4 md:mt-0 md:ml-6">
                        <p className="text-xs text-gray-500">
                          Booked: {new Date(booking.created_at).toLocaleDateString()}
                        </p>
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
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all' || gameFilter !== 'all' || dateFilter !== 'all'
                      ? 'No bookings match your current filters.'
                      : "You haven't made any bookings yet."}
                  </p>
                  {!searchTerm && statusFilter === 'all' && gameFilter === 'all' && dateFilter === 'all' && (
                    <Button asChild>
                      <a href="/book">Book Your First Game</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
