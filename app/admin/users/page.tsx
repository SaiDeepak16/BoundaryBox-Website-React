'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Search, Filter, Mail, Calendar, Activity, UserCheck, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { userService } from '@/lib/user-service'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface UserWithStats {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  last_sign_in_at?: string
  email_verified?: boolean
  phone_verified?: boolean
  totalBookings?: number
  totalSpent?: number
  lastBooking?: string
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchAllUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter, statusFilter])

  const fetchAllUsers = async () => {
    try {
      setLoading(true)
      
      const { data } = await userService.getAllUsersWithStats()
      if (data) {
        setUsers(data as UserWithStats[])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      filtered = filtered.filter(user => {
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null
        
        switch (statusFilter) {
          case 'active':
            return lastSignIn && lastSignIn >= thirtyDaysAgo
          case 'inactive':
            return !lastSignIn || lastSignIn < thirtyDaysAgo
          case 'verified':
            return user.email_verified
          case 'unverified':
            return !user.email_verified
          default:
            return true
        }
      })
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setFilteredUsers(filtered)
  }

  const getUserStats = () => {
    const total = filteredUsers.length
    const admins = filteredUsers.filter(u => u.role === 'admin').length
    const activeUsers = filteredUsers.filter(u => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
      return lastSignIn && lastSignIn >= thirtyDaysAgo
    }).length
    const totalRevenue = filteredUsers.reduce((sum, u) => sum + (u.totalSpent || 0), 0)
    
    return { total, admins, activeUsers, totalRevenue }
  }

  const getActivityStatus = (user: UserWithStats) => {
    if (!user.last_sign_in_at) return { label: 'Never', color: 'bg-gray-100 text-gray-800' }
    
    const lastSignIn = new Date(user.last_sign_in_at)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === 0) return { label: 'Today', color: 'bg-green-100 text-green-800' }
    if (daysDiff <= 7) return { label: 'This Week', color: 'bg-blue-100 text-blue-800' }
    if (daysDiff <= 30) return { label: 'This Month', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Inactive', color: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <AuthGuard requireRole="admin">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading users...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const stats = getUserStats()

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Users Management</h1>
                <p className="text-gray-600">Manage and monitor all platform users</p>
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
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <UserCheck className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue}</p>
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
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active (30 days)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="verified">Email Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setRoleFilter('all')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const activityStatus = getActivityStatus(user)
                
                return (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-3">
                            <div>
                              <h3 className="text-lg font-semibold">{user.name}</h3>
                              <p className="text-sm text-gray-600 flex items-center">
                                <Mail className="h-4 w-4 mr-1" />
                                {user.email}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                              <Badge className={activityStatus.color}>
                                {activityStatus.label}
                              </Badge>
                              {user.email_verified && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Verified
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <p className="font-medium">Total Bookings</p>
                              <p>{user.totalBookings || 0}</p>
                            </div>
                            <div>
                              <p className="font-medium">Total Spent</p>
                              <p>₹{user.totalSpent || 0}</p>
                            </div>
                            <div>
                              <p className="font-medium">Joined</p>
                              <p>{new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="font-medium">Last Sign In</p>
                              <p>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</p>
                            </div>
                          </div>

                          {user.lastBooking && (
                            <p className="text-xs text-gray-500 mt-2">
                              Last booking: {new Date(user.lastBooking).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600">
                    {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'No users match your current filters.'
                      : 'No users have registered yet.'}
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
