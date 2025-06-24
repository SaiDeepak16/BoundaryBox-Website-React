'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Gamepad2, Users, DollarSign, Search, Filter, Calendar, Clock, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { gameService } from '@/lib/game-service'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
  created_at: string
  updated_at: string
}

interface GameWithStats extends Game {
  totalBookings?: number
  confirmedBookings?: number
  totalRevenue?: number
}

export default function GamesPage() {
  const { toast } = useToast()
  
  const [games, setGames] = useState<GameWithStats[]>([])
  const [filteredGames, setFilteredGames] = useState<GameWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [priceFilter, setPriceFilter] = useState('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [])

  useEffect(() => {
    filterAndSortGames()
  }, [games, searchTerm, sortBy, priceFilter])

  const fetchGames = async () => {
    try {
      setLoading(true)
      
      const { data } = await gameService.getGamesWithStats()
      if (data) {
        setGames(data)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortGames = () => {
    let filtered = [...games]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(game =>
        game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Price filter
    if (priceFilter !== 'all') {
      switch (priceFilter) {
        case 'low':
          filtered = filtered.filter(game => game.price_per_hour <= 200)
          break
        case 'medium':
          filtered = filtered.filter(game => game.price_per_hour > 200 && game.price_per_hour <= 400)
          break
        case 'high':
          filtered = filtered.filter(game => game.price_per_hour > 400)
          break
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'price_low':
          return a.price_per_hour - b.price_per_hour
        case 'price_high':
          return b.price_per_hour - a.price_per_hour
        case 'popular':
          return (b.totalBookings || 0) - (a.totalBookings || 0)
        case 'players':
          return b.max_players - a.max_players
        default:
          return 0
      }
    })

    setFilteredGames(filtered)
  }

  const getPriceCategory = (price: number) => {
    if (price <= 200) return { label: 'Budget Friendly', color: 'bg-green-100 text-green-800' }
    if (price <= 400) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Premium', color: 'bg-purple-100 text-purple-800' }
  }

  const getPopularityBadge = (bookings: number) => {
    if (bookings >= 10) return { label: 'Very Popular', color: 'bg-red-100 text-red-800' }
    if (bookings >= 5) return { label: 'Popular', color: 'bg-orange-100 text-orange-800' }
    if (bookings >= 1) return { label: 'Trending', color: 'bg-blue-100 text-blue-800' }
    return null
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setSortBy('name')
    setPriceFilter('all')
    setIsFilterOpen(false)
  }

  const hasActiveFilters = searchTerm !== '' || sortBy !== 'name' || priceFilter !== 'all'

  if (loading) {
    return (
      <AuthGuard requireRole="user">
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading games...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Games</h1>
            <p className="text-gray-600">Discover and book your favorite games</p>
          </div>

          {/* Mobile Filter Button */}
          <div className="md:hidden mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <Gamepad2 className="h-4 w-4 mr-2" />
                {filteredGames.length} games found
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
                      Filter and search games to find what you're looking for
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    {/* Search */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Search Games</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search games..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name (A-Z)</SelectItem>
                          <SelectItem value="price_low">Price (Low to High)</SelectItem>
                          <SelectItem value="price_high">Price (High to Low)</SelectItem>
                          <SelectItem value="popular">Most Popular</SelectItem>
                          <SelectItem value="players">Max Players</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Price Filter */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
                      <Select value={priceFilter} onValueChange={setPriceFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Price range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Prices</SelectItem>
                          <SelectItem value="low">₹0 - ₹200</SelectItem>
                          <SelectItem value="medium">₹201 - ₹400</SelectItem>
                          <SelectItem value="high">₹401+</SelectItem>
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

          {/* Desktop Filters and Search */}
          <Card className="mb-6 hidden md:block">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search games..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="price_low">Price (Low to High)</SelectItem>
                    <SelectItem value="price_high">Price (High to Low)</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="players">Max Players</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="low">₹0 - ₹200</SelectItem>
                    <SelectItem value="medium">₹201 - ₹400</SelectItem>
                    <SelectItem value="high">₹401+</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-600">
                    <Gamepad2 className="h-4 w-4 mr-2" />
                    {filteredGames.length} games found
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Games Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredGames.length > 0 ? (
              filteredGames.map((game) => {
                const priceCategory = getPriceCategory(game.price_per_hour)
                const popularityBadge = getPopularityBadge(game.totalBookings || 0)
                
                return (
                  <Card key={game.id} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{game.name}</CardTitle>
                          <CardDescription className="mt-2">{game.description}</CardDescription>
                        </div>
                        <Gamepad2 className="h-6 w-6 text-green-500" />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className={priceCategory.color}>
                          {priceCategory.label}
                        </Badge>
                        {popularityBadge && (
                          <Badge className={popularityBadge.color}>
                            {popularityBadge.label}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                            <span>₹{game.price_per_hour}/hour</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2 text-blue-600" />
                            <span>Max {game.max_players} players</span>
                          </div>
                        </div>

                        {game.totalBookings !== undefined && (
                          <div className="text-sm text-gray-600">
                            <div className="flex justify-between">
                              <span>Total Bookings:</span>
                              <span className="font-medium">{game.totalBookings}</span>
                            </div>
                            {game.confirmedBookings !== undefined && (
                              <div className="flex justify-between">
                                <span>Completed:</span>
                                <span className="font-medium">{game.confirmedBookings}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex space-x-2 pt-2">
                          <Link href="/book" className="flex-1">
                            <Button className="w-full">
                              <Calendar className="h-4 w-4 mr-2" />
                              Book Now
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <Gamepad2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || priceFilter !== 'all'
                    ? 'No games match your current filters. Try adjusting your search criteria.'
                    : 'No games are currently available.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {filteredGames.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{filteredGames.length}</p>
                    <p className="text-sm text-gray-600">Available Games</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{Math.min(...filteredGames.map(g => g.price_per_hour))}
                    </p>
                    <p className="text-sm text-gray-600">Starting Price</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.max(...filteredGames.map(g => g.max_players))}
                    </p>
                    <p className="text-sm text-gray-600">Max Players</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {filteredGames.reduce((sum, g) => sum + (g.totalBookings || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
