'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Settings,
  BarChart3
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookingService } from '@/lib/booking-service'
import { gameService } from '@/lib/game-service'
import { userService } from '@/lib/user-service'
import { useToast } from '@/hooks/use-toast'
import { AddGameModal } from '@/components/admin/add-game-modal'
import { EditGameModal } from '@/components/admin/edit-game-modal'
import { DeleteGameDialog } from '@/components/admin/delete-game-dialog'
import { PendingRequestsModal } from '@/components/admin/pending-requests-modal'
import Link from 'next/link'

interface BookingWithDetails {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  total_cost: number
  notes?: string
  game: {
    name: string
  }
  profile: {
    name: string
    email: string
  }
}

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeUsers: 0,
    monthlyRevenue: 0,
    pendingRequests: 0
  })
  const [pendingBookings, setPendingBookings] = useState<BookingWithDetails[]>([])
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([])
  const [games, setGames] = useState<Game[]>([])

  // Modal states
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [deletingGame, setDeletingGame] = useState<Game | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingModalOpen, setPendingModalOpen] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch booking statistics
      const { data: bookingStats } = await bookingService.getBookingStats()
      if (bookingStats) {
        setStats(prev => ({
          ...prev,
          totalBookings: bookingStats.totalBookings,
          pendingRequests: bookingStats.pendingBookings,
          monthlyRevenue: bookingStats.totalRevenue
        }))
      }

      // Fetch user statistics
      const { data: userStats } = await userService.getSystemStats()
      if (userStats) {
        setStats(prev => ({
          ...prev,
          activeUsers: userStats.activeUsers
        }))
      }

      // Fetch pending bookings
      const { data: pending } = await bookingService.getAllBookings('pending')
      if (pending) {
        setPendingBookings(pending as BookingWithDetails[])
      }

      // Fetch recent bookings
      const { data: recent } = await bookingService.getAllBookings()
      if (recent) {
        setRecentBookings(recent.slice(0, 5) as BookingWithDetails[])
      }

      // Fetch games
      const { data: gamesData } = await gameService.getAllGames()
      if (gamesData) {
        setGames(gamesData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const { error } = await bookingService.confirmBooking(bookingId)
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking approved successfully"
      })

      // Refresh data
      fetchDashboardData()
    } catch (error) {
      console.error('Error approving booking:', error)
      toast({
        title: "Error",
        description: "Failed to approve booking",
        variant: "destructive"
      })
    }
  }

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const { error } = await bookingService.cancelBooking(bookingId, 'Rejected by admin')
      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking rejected successfully"
      })

      // Refresh data
      fetchDashboardData()
    } catch (error) {
      console.error('Error rejecting booking:', error)
      toast({
        title: "Error",
        description: "Failed to reject booking",
        variant: "destructive"
      })
    }
  }

  const handleEditGame = (game: Game) => {
    setEditingGame(game)
    setEditModalOpen(true)
  }

  const handleDeleteGame = (game: Game) => {
    setDeletingGame(game)
    setDeleteDialogOpen(true)
  }

  const handleGameUpdated = () => {
    fetchDashboardData()
  }

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage bookings, users, and system settings</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/admin/bookings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.totalBookings}</div>
                      <p className="text-xs text-muted-foreground">
                        Click to manage all bookings
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stats.activeUsers}</div>
                      <p className="text-xs text-muted-foreground">
                        Click to manage users
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/revenue">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">
                        Click for analytics
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setPendingModalOpen(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                    <p className="text-xs text-muted-foreground">
                      Click to review
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="bookings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="games">Games</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-6">
              {/* Pending Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Pending Approvals
                  </CardTitle>
                  <CardDescription>Booking requests awaiting your approval</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse p-4 border rounded-lg">
                          <div className="flex justify-between">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-48"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="flex space-x-2">
                              <div className="h-8 bg-gray-200 rounded w-20"></div>
                              <div className="h-8 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : pendingBookings.length > 0 ? (
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold">{booking.profile?.name || 'Unknown User'}</h3>
                            <p className="text-sm text-gray-600">
                              {booking.game?.name || 'Unknown Game'} • {new Date(booking.booking_date).toLocaleDateString()} • {booking.start_time} - {booking.end_time}
                            </p>
                            <p className="text-sm font-medium">₹{booking.total_cost}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveBooking(booking.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectBooking(booking.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                      <p className="text-gray-500">No pending approvals</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Latest booking activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse p-4 border rounded-lg">
                          <div className="flex justify-between">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 rounded w-48"></div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="h-6 bg-gray-200 rounded w-16"></div>
                              <div className="h-4 bg-gray-200 rounded w-12"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentBookings.length > 0 ? (
                    <div className="space-y-4">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h3 className="font-semibold">{booking.profile?.name || 'Unknown User'}</h3>
                            <p className="text-sm text-gray-600">
                              {booking.game?.name || 'Unknown Game'} • {new Date(booking.booking_date).toLocaleDateString()} • {booking.start_time} - {booking.end_time}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status.replace('_', ' ')}
                            </Badge>
                            <span className="font-semibold">₹{booking.total_cost}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No recent bookings</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="games" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5" />
                    Games Management
                  </CardTitle>
                  <CardDescription>Add, edit, or remove games from your system</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardHeader>
                            <div className="flex justify-between">
                              <div className="h-6 bg-gray-200 rounded w-24"></div>
                              <div className="h-6 bg-gray-200 rounded w-16"></div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 mb-4">
                              <div className="h-4 bg-gray-200 rounded w-32"></div>
                              <div className="h-4 bg-gray-200 rounded w-28"></div>
                            </div>
                            <div className="flex space-x-2">
                              <div className="h-8 bg-gray-200 rounded w-12"></div>
                              <div className="h-8 bg-gray-200 rounded w-16"></div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {games.map((game) => (
                        <Card key={game.id}>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                              {game.name}
                              <Badge variant="default">
                                Active
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm mb-4">
                              <p><strong>Price:</strong> ₹{game.price_per_hour}/hour</p>
                              <p><strong>Max Players:</strong> {game.max_players}</p>
                              <p className="text-gray-600">{game.description}</p>
                            </div>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditGame(game)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteGame(game)}
                              >
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  <div className="mt-4">
                    <AddGameModal onGameAdded={handleGameUpdated} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Analytics Overview
                  </CardTitle>
                  <CardDescription>Insights and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Popular Games</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Cricket</span>
                          <span className="font-medium">65%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Badminton</span>
                          <span className="font-medium">25%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Carrom</span>
                          <span className="font-medium">10%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Peak Hours</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>6:00 PM - 8:00 PM</span>
                          <span className="font-medium">High</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2:00 PM - 4:00 PM</span>
                          <span className="font-medium">Medium</span>
                        </div>
                        <div className="flex justify-between">
                          <span>10:00 AM - 12:00 PM</span>
                          <span className="font-medium">Low</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    System Settings
                  </CardTitle>
                  <CardDescription>Configure your booking system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Operating Hours</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Opening Time</label>
                          <input type="time" className="w-full mt-1 p-2 border rounded" defaultValue="08:00" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Closing Time</label>
                          <input type="time" className="w-full mt-1 p-2 border rounded" defaultValue="22:00" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Booking Rules</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          Allow advance booking up to 7 days
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" defaultChecked />
                          Require admin approval for all bookings
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="mr-2" />
                          Send SMS notifications for booking updates
                        </label>
                      </div>
                    </div>

                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modals */}
        <EditGameModal
          game={editingGame}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onGameUpdated={handleGameUpdated}
        />

        <DeleteGameDialog
          game={deletingGame}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onGameDeleted={handleGameUpdated}
        />

        <PendingRequestsModal
          open={pendingModalOpen}
          onOpenChange={setPendingModalOpen}
          onRequestsUpdated={fetchDashboardData}
        />
      </div>
    </AuthGuard>
  )
}