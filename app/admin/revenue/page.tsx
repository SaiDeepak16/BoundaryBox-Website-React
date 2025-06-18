'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, TrendingUp, Calendar, Trophy, BarChart3, PieChart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bookingService } from '@/lib/booking-service'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface RevenueData {
  totalRevenue: number
  monthlyRevenue: number
  weeklyRevenue: number
  dailyRevenue: number
  topGames: Array<{
    game_name: string
    revenue: number
    bookings: number
  }>
  monthlyBreakdown: Array<{
    month: string
    revenue: number
    bookings: number
  }>
  recentTransactions: Array<{
    id: string
    user_name: string
    game_name: string
    amount: number
    date: string
    status: string
  }>
}

export default function AdminRevenuePage() {
  const { toast } = useToast()
  
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('all')

  useEffect(() => {
    fetchRevenueData()
  }, [timeFilter])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      
      const { data } = await bookingService.getRevenueAnalytics(timeFilter)
      if (data) {
        setRevenueData(data as RevenueData)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      toast({
        title: "Error",
        description: "Failed to load revenue data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getGrowthPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  if (loading) {
    return (
      <AuthGuard requireRole="admin">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading revenue data...</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!revenueData) {
    return (
      <AuthGuard requireRole="admin">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No revenue data available</h3>
              <p className="text-gray-600">Revenue analytics will appear here once bookings are made.</p>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Revenue Analytics</h1>
                <p className="text-gray-600">Track and analyze your business revenue</p>
              </div>
              <div className="flex space-x-4">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                  </SelectContent>
                </Select>
                <Link href="/admin">
                  <Button variant="outline">
                    ← Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Revenue Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{revenueData.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">₹{revenueData.monthlyRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">This Week</p>
                    <p className="text-2xl font-bold text-gray-900">₹{revenueData.weeklyRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today</p>
                    <p className="text-2xl font-bold text-gray-900">₹{revenueData.dailyRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Performing Games */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Top Performing Games
                </CardTitle>
                <CardDescription>Games generating the most revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.topGames.length > 0 ? (
                    revenueData.topGames.map((game, index) => (
                      <div key={game.game_name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{game.game_name}</p>
                            <p className="text-sm text-gray-600">{game.bookings} bookings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">₹{game.revenue}</p>
                          <p className="text-xs text-gray-500">
                            ₹{Math.round(game.revenue / game.bookings)} avg
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-600">No game revenue data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Monthly Breakdown
                </CardTitle>
                <CardDescription>Revenue trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueData.monthlyBreakdown.length > 0 ? (
                    revenueData.monthlyBreakdown.slice(0, 6).map((month) => (
                      <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{month.month}</p>
                          <p className="text-sm text-gray-600">{month.bookings} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{month.revenue}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-600">No monthly data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest confirmed bookings and payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.recentTransactions.length > 0 ? (
                  revenueData.recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">{transaction.user_name}</p>
                            <p className="text-sm text-gray-600">{transaction.game_name}</p>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                        <p className="font-bold text-green-600">₹{transaction.amount}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600">No recent transactions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}
