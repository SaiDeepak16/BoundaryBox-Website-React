'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, Trophy, DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { gameService } from '@/lib/game-service'
import { bookingService } from '@/lib/booking-service'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
}

interface TimeSlot {
  start: string
  end: string
}

export default function BookPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    gameId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    notes: ''
  })
  
  const [estimatedCost, setEstimatedCost] = useState(0)

  useEffect(() => {
    fetchGames()
  }, [])

  useEffect(() => {
    if (formData.gameId && formData.bookingDate) {
      fetchAvailableSlots()
    }
  }, [formData.gameId, formData.bookingDate])

  useEffect(() => {
    if (formData.gameId && formData.startTime && formData.endTime) {
      calculateCost()
    }
  }, [formData.gameId, formData.startTime, formData.endTime])

  const fetchGames = async () => {
    try {
      const { data } = await gameService.getAllGames()
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

  const fetchAvailableSlots = async () => {
    if (!formData.gameId || !formData.bookingDate) return

    try {
      const { data } = await gameService.getAvailableTimeSlots(formData.gameId, formData.bookingDate)
      if (data) {
        setAvailableSlots(data)
      }
    } catch (error) {
      console.error('Error fetching available slots:', error)
    }
  }

  const calculateCost = async () => {
    if (!formData.gameId || !formData.startTime || !formData.endTime) return

    try {
      const { data } = await bookingService.calculateBookingCost(
        formData.gameId,
        formData.startTime,
        formData.endTime
      )
      if (data) {
        setEstimatedCost(data)
      }
    } catch (error) {
      console.error('Error calculating cost:', error)
    }
  }

  const handleGameSelect = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    setSelectedGame(game || null)
    setFormData(prev => ({ ...prev, gameId, startTime: '', endTime: '' }))
    setEstimatedCost(0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to make a booking",
        variant: "destructive"
      })
      return
    }

    if (!formData.gameId || !formData.bookingDate || !formData.startTime || !formData.endTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)

    try {
      const { error } = await bookingService.createBooking({
        user_id: user.id,
        game_id: formData.gameId,
        booking_date: formData.bookingDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        notes: formData.notes || null
      })

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Booking created successfully! Awaiting admin approval."
      })

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating booking:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7) // Allow booking up to 7 days in advance
    return maxDate.toISOString().split('T')[0]
  }

  return (
    <AuthGuard requireRole="user">
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Game</h1>
            <p className="text-gray-600">Select your preferred game, date, and time slot</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Booking Details
                  </CardTitle>
                  <CardDescription>Fill in the details for your booking</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Game Selection */}
                    <div>
                      <Label htmlFor="game">Select Game *</Label>
                      <Select onValueChange={handleGameSelect} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue placeholder={loading ? "Loading games..." : "Choose a game"} />
                        </SelectTrigger>
                        <SelectContent>
                          {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name} - ₹{game.price_per_hour}/hour
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <Label htmlFor="date">Booking Date *</Label>
                      <Input
                        type="date"
                        id="date"
                        min={getTomorrowDate()}
                        max={getMaxDate()}
                        value={formData.bookingDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                        disabled={!formData.gameId}
                      />
                    </div>

                    {/* Time Selection */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time *</Label>
                        <Select 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}
                          disabled={!formData.bookingDate || availableSlots.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots.map((slot) => (
                              <SelectItem key={slot.start} value={slot.start}>
                                {slot.start}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="endTime">End Time *</Label>
                        <Select 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
                          disabled={!formData.startTime}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots
                              .filter(slot => slot.start >= formData.startTime)
                              .map((slot) => (
                                <SelectItem key={slot.end} value={slot.end}>
                                  {slot.end}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special requirements or notes..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={submitting || !formData.gameId || !formData.bookingDate || !formData.startTime || !formData.endTime}
                    >
                      {submitting ? 'Creating Booking...' : 'Create Booking'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Booking Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedGame ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold">{selectedGame.name}</h3>
                        <p className="text-sm text-gray-600">{selectedGame.description}</p>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Price per hour:</span>
                          <span>₹{selectedGame.price_per_hour}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max players:</span>
                          <span>{selectedGame.max_players}</span>
                        </div>
                        {formData.bookingDate && (
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span>{new Date(formData.bookingDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {formData.startTime && formData.endTime && (
                          <div className="flex justify-between">
                            <span>Time:</span>
                            <span>{formData.startTime} - {formData.endTime}</span>
                          </div>
                        )}
                      </div>
                      
                      {estimatedCost > 0 && (
                        <div className="border-t pt-4">
                          <div className="flex justify-between font-semibold">
                            <span>Estimated Total:</span>
                            <span>₹{estimatedCost}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Select a game to see details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
