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
  duration: number
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
    calculateCost()
  }, [selectedGame, formData.startTime, formData.endTime, availableSlots])

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

  const calculateCost = () => {
    if (!selectedGame || !formData.startTime || !formData.endTime) {
      setEstimatedCost(0)
      return
    }

    // Find the selected slot to get the duration
    const selectedSlot = availableSlots.find(
      slot => slot.start === formData.startTime && slot.end === formData.endTime
    )

    if (selectedSlot) {
      const cost = Math.round(selectedGame.price_per_hour * selectedSlot.duration)
      setEstimatedCost(cost)
    } else {
      setEstimatedCost(0)
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
        
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Book a Game</h1>
            <p className="text-gray-600">Select your preferred game, date, and time slot</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Booking Form */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg md:text-xl">
                    <Calendar className="mr-2 h-5 w-5" />
                    Booking Details
                  </CardTitle>
                  <CardDescription>Fill in the details for your booking</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
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

                    {/* Time Slot Selection */}
                    <div>
                      <Label>Available Time Slots *</Label>
                      <p className="text-sm text-gray-600 mb-3">Select your preferred time slot</p>

                      {availableSlots.length > 0 ? (
                        <div className="space-y-4">
                          {/* Mobile: Show as list, Desktop: Show as grid */}
                          <div className="block md:hidden">
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              {availableSlots
                                .sort((a, b) => a.start.localeCompare(b.start) || a.duration - b.duration)
                                .map((slot) => {
                                  const isSelected = formData.startTime === slot.start && formData.endTime === slot.end
                                  const durationText = slot.duration === 1 ? '1 hour' :
                                                     slot.duration === 1.5 ? '1.5 hours' :
                                                     `${slot.duration} hours`

                                  return (
                                    <button
                                      key={`${slot.start}-${slot.end}`}
                                      type="button"
                                      onClick={() => setFormData(prev => ({
                                        ...prev,
                                        startTime: slot.start,
                                        endTime: slot.end
                                      }))}
                                      className={`w-full p-4 text-left rounded-lg border transition-all ${
                                        isSelected
                                          ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <div className="text-base font-medium">
                                            {slot.start} - {slot.end}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {durationText}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-lg font-bold text-green-600">
                                            ₹{selectedGame ? Math.round(selectedGame.price_per_hour * slot.duration) : 0}
                                          </div>
                                          {isSelected && (
                                            <div className="text-xs text-green-600">Selected</div>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                            </div>
                          </div>

                          {/* Desktop: Group by start time */}
                          <div className="hidden md:block">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
                              {Array.from(new Set(availableSlots.map(slot => slot.start)))
                                .sort()
                                .map(startTime => {
                                  const slotsForStartTime = availableSlots
                                    .filter(slot => slot.start === startTime)
                                    .sort((a, b) => a.duration - b.duration)

                                  return (
                                    <div key={startTime} className="space-y-2">
                                      <h4 className="text-sm font-medium text-gray-700 sticky top-0 bg-white py-1">
                                        From {startTime}
                                      </h4>
                                      {slotsForStartTime.map((slot) => {
                                        const isSelected = formData.startTime === slot.start && formData.endTime === slot.end
                                        const durationText = slot.duration === 1 ? '1h' :
                                                           slot.duration === 1.5 ? '1.5h' :
                                                           `${slot.duration}h`

                                        return (
                                          <button
                                            key={`${slot.start}-${slot.end}`}
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                              ...prev,
                                              startTime: slot.start,
                                              endTime: slot.end
                                            }))}
                                            className={`w-full p-3 text-left rounded-lg border transition-all ${
                                              isSelected
                                                ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200'
                                                : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                            }`}
                                          >
                                            <div className="text-sm font-medium">
                                              {slot.start} - {slot.end}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {durationText}
                                            </div>
                                            <div className="text-xs text-green-600 font-medium">
                                              ₹{selectedGame ? Math.round(selectedGame.price_per_hour * slot.duration) : 0}
                                            </div>
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        </div>
                      ) : formData.bookingDate ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No available slots for this date</p>
                          <p className="text-sm text-gray-400">Try selecting a different date</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">Select a date to see available slots</p>
                        </div>
                      )}
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

                    <div className="pt-4 border-t">
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-medium"
                        disabled={submitting || !formData.gameId || !formData.bookingDate || !formData.startTime || !formData.endTime}
                      >
                        {submitting ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Booking...
                          </div>
                        ) : (
                          `Create Booking${estimatedCost > 0 ? ` - ₹${estimatedCost}` : ''}`
                        )}
                      </Button>

                      {/* Mobile: Show quick summary */}
                      {formData.startTime && formData.endTime && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg md:hidden">
                          <div className="text-sm text-green-800">
                            <div className="font-medium">Selected: {formData.startTime} - {formData.endTime}</div>
                            {estimatedCost > 0 && (
                              <div>Total: ₹{estimatedCost}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Booking Summary */}
            <div className="order-1 lg:order-2">
              <Card className="sticky top-4">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg md:text-xl">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Booking Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {selectedGame ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedGame.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{selectedGame.description}</p>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-gray-600">Price/hour</div>
                            <div className="font-semibold">₹{selectedGame.price_per_hour}</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-gray-600">Max players</div>
                            <div className="font-semibold">{selectedGame.max_players}</div>
                          </div>
                        </div>

                        {formData.bookingDate && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-blue-600 text-xs font-medium">BOOKING DATE</div>
                            <div className="font-semibold text-blue-800">
                              {new Date(formData.bookingDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        )}

                        {formData.startTime && formData.endTime && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-green-600 text-xs font-medium">SELECTED TIME</div>
                            <div className="font-semibold text-green-800">
                              {formData.startTime} - {formData.endTime}
                            </div>
                            {(() => {
                              const selectedSlot = availableSlots.find(
                                slot => slot.start === formData.startTime && slot.end === formData.endTime
                              )
                              return selectedSlot && (
                                <div className="text-green-600 text-xs">
                                  Duration: {selectedSlot.duration === 1 ? '1 hour' :
                                           selectedSlot.duration === 1.5 ? '1.5 hours' :
                                           `${selectedSlot.duration} hours`}
                                </div>
                              )
                            })()}
                          </div>
                        )}
                      </div>

                      {estimatedCost > 0 && (
                        <div className="border-t pt-4">
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 font-medium">Total Amount:</span>
                              <span className="text-2xl font-bold text-green-600">₹{estimatedCost}</span>
                            </div>
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
