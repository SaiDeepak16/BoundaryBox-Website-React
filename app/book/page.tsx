'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, Trophy, DollarSign, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { gameService } from '@/lib/game-service'
import { bookingService } from '@/lib/booking-service'
import { supabase } from '@/lib/supabase'
import { settingsService, SystemSettings } from '@/lib/settings-service'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
}



export default function BookPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [games, setGames] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [existingBookings, setExistingBookings] = useState<{start_time: string, end_time: string}[]>([])
  const [settings, setSettings] = useState<SystemSettings | null>(null)
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
  const [timeError, setTimeError] = useState('')

  useEffect(() => {
    fetchGames()
    fetchSettings()
  }, [])

  useEffect(() => {
    if (formData.gameId && formData.bookingDate) {
      fetchExistingBookings()
    }
  }, [formData.gameId, formData.bookingDate])

  useEffect(() => {
    calculateCost()
    validateTimeSelection()
  }, [selectedGame, formData.startTime, formData.endTime, existingBookings, settings])

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
    }
  }

  const fetchSettings = async () => {
    try {
      const { data, error } = await settingsService.getSettings()

      if (error) {
        throw error
      }

      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      // Use default settings if fetch fails
      setSettings({
        opening_time: '06:00',
        closing_time: '22:00',
        is_24_7: false,
        advance_booking_days: 7,
        require_admin_approval: true,
        booking_slot_duration: 30,
        min_booking_duration: 1,
        max_booking_duration: 4,
        cancellation_deadline: 2
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchExistingBookings = async () => {
    if (!formData.gameId || !formData.bookingDate) return

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('game_id', formData.gameId)
        .eq('booking_date', formData.bookingDate)
        .in('status', ['pending', 'confirmed'])

      if (error) throw error
      setExistingBookings(data || [])
    } catch (error) {
      console.error('Error fetching existing bookings:', error)
      setExistingBookings([])
    }
  }

  const calculateCost = () => {
    if (!selectedGame || !formData.startTime || !formData.endTime) {
      setEstimatedCost(0)
      return
    }

    // Calculate duration in hours
    const duration = calculateDuration(formData.startTime, formData.endTime)
    if (duration > 0) {
      const cost = Math.round(selectedGame.price_per_hour * duration)
      setEstimatedCost(cost)
    } else {
      setEstimatedCost(0)
    }
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime || !settings) return 0

    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)

    const startTotalMinutes = startHour * 60 + startMinute
    let endTotalMinutes = endHour * 60 + endMinute

    // Handle overnight bookings in 24/7 mode
    if (settings.is_24_7 && endTotalMinutes <= startTotalMinutes) {
      // Add 24 hours to end time for overnight booking
      endTotalMinutes += 24 * 60
    }

    if (endTotalMinutes <= startTotalMinutes) return 0

    return (endTotalMinutes - startTotalMinutes) / 60
  }

  const validateTimeSelection = () => {
    setTimeError('')

    if (!formData.startTime || !formData.endTime || !settings) return

    const duration = calculateDuration(formData.startTime, formData.endTime)

    // Check minimum duration from settings
    if (duration < settings.min_booking_duration) {
      setTimeError(`Minimum booking duration is ${settings.min_booking_duration} hour${settings.min_booking_duration !== 1 ? 's' : ''}`)
      return
    }

    // Check maximum duration from settings
    if (duration > settings.max_booking_duration) {
      setTimeError(`Maximum booking duration is ${settings.max_booking_duration} hour${settings.max_booking_duration !== 1 ? 's' : ''}`)
      return
    }

    // Check for conflicts with existing bookings
    const hasConflict = existingBookings.some(booking => {
      return (
        (formData.startTime >= booking.start_time && formData.startTime < booking.end_time) ||
        (formData.endTime > booking.start_time && formData.endTime <= booking.end_time) ||
        (formData.startTime <= booking.start_time && formData.endTime >= booking.end_time)
      )
    })

    if (hasConflict) {
      setTimeError('Selected time conflicts with an existing booking')
      return
    }
  }

  const generateTimeOptions = () => {
    if (!settings) return []

    const options = []
    const slotDuration = settings.booking_slot_duration

    if (settings.is_24_7) {
      // 24/7 mode: generate slots for full 24 hours
      for (let minutes = 0; minutes < 24 * 60; minutes += slotDuration) {
        const hour = Math.floor(minutes / 60)
        const minute = minutes % 60
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    } else {
      // Regular mode: use opening and closing times
      const [openHour, openMinute] = settings.opening_time.split(':').map(Number)
      const [closeHour, closeMinute] = settings.closing_time.split(':').map(Number)

      const startTotalMinutes = openHour * 60 + openMinute
      const endTotalMinutes = closeHour * 60 + closeMinute

      for (let minutes = startTotalMinutes; minutes < endTotalMinutes; minutes += slotDuration) {
        const hour = Math.floor(minutes / 60)
        const minute = minutes % 60
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(timeString)
      }
    }

    return options
  }

  const isTimeSlotAvailable = (startTime: string, endTime: string) => {
    // Check if the proposed time slot conflicts with any existing booking
    return !existingBookings.some(booking => {
      return (
        (startTime >= booking.start_time && startTime < booking.end_time) ||
        (endTime > booking.start_time && endTime <= booking.end_time) ||
        (startTime <= booking.start_time && endTime >= booking.end_time)
      )
    })
  }

  const getAvailableStartTimes = () => {
    if (!settings) return []

    const allTimes = generateTimeOptions()
    return allTimes.filter(time => {
      // Check if this start time can accommodate at least the minimum duration without conflicts
      const minDurationLater = addHoursToTime(time, settings.min_booking_duration)
      return isTimeSlotAvailable(time, minDurationLater)
    })
  }

  const addHoursToTime = (timeString: string, hours: number): string => {
    const [hour, minute] = timeString.split(':').map(Number)
    const totalMinutes = hour * 60 + minute + (hours * 60)
    let newHour = Math.floor(totalMinutes / 60)
    const newMinute = totalMinutes % 60

    // Handle 24-hour wraparound
    newHour = newHour % 24

    return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`
  }

  const handleGameSelect = (gameId: string) => {
    const game = games.find(g => g.id === gameId)
    setSelectedGame(game || null)
    setFormData(prev => ({ ...prev, gameId, startTime: '', endTime: '' }))
    setEstimatedCost(0)
    setTimeError('')
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

    if (timeError) {
      toast({
        title: "Error",
        description: timeError,
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

  const getMinDate = () => {
    const today = new Date()

    // If 24/7 mode is enabled, allow today's bookings
    if (settings?.is_24_7) {
      return today.toISOString().split('T')[0]
    }

    // Otherwise, only allow tomorrow onwards
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    if (!settings) return new Date().toISOString().split('T')[0]

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + settings.advance_booking_days)
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
                      <Select onValueChange={handleGameSelect} disabled={loading || !settings}>
                        <SelectTrigger>
                          <SelectValue placeholder={loading || !settings ? "Loading..." : "Choose a game"} />
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
                        min={getMinDate()}
                        max={getMaxDate()}
                        value={formData.bookingDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingDate: e.target.value }))}
                        disabled={!formData.gameId || !settings}
                      />
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-4">
                      <div>
                        <Label>Booking Time *</Label>
                        <p className="text-sm text-gray-600 mb-3">
                          {settings ? (
                            settings.is_24_7 ?
                              `Select start and end time (${settings.booking_slot_duration}-minute intervals, ${settings.min_booking_duration}-${settings.max_booking_duration} hour duration) - 24/7 operation, overnight bookings allowed` :
                              `Select start and end time (${settings.booking_slot_duration}-minute intervals, ${settings.min_booking_duration}-${settings.max_booking_duration} hour duration)`
                          ) : (
                            'Loading booking configuration...'
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Start Time */}
                        <div>
                          <Label htmlFor="startTime">Start Time *</Label>
                          <Select
                            value={formData.startTime}
                            onValueChange={(value) => {
                              setFormData(prev => {
                                // Reset end time if it's before or equal to start time
                                const newEndTime = prev.endTime && value >= prev.endTime ? '' : prev.endTime
                                return { ...prev, startTime: value, endTime: newEndTime }
                              })
                            }}
                            disabled={!formData.bookingDate || !settings}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select start time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {generateTimeOptions().map((time) => {
                                const isAvailable = getAvailableStartTimes().includes(time)
                                return (
                                  <SelectItem
                                    key={time}
                                    value={time}
                                    disabled={!isAvailable}
                                    className={!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                                  >
                                    {time} {!isAvailable && '(Booked)'}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* End Time */}
                        <div>
                          <Label htmlFor="endTime">End Time *</Label>
                          <Select
                            value={formData.endTime}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
                            disabled={!formData.startTime || !settings}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select end time" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {generateTimeOptions()
                                .filter(time => {
                                  if (!formData.startTime || !settings) return false
                                  const duration = calculateDuration(formData.startTime, time)
                                  return duration >= settings.min_booking_duration && duration <= settings.max_booking_duration
                                })
                                .map((time) => {
                                  const duration = calculateDuration(formData.startTime, time)
                                  const durationText = duration === 1 ? '1h' :
                                                     duration === 1.5 ? '1.5h' :
                                                     `${duration}h`
                                  const isAvailable = isTimeSlotAvailable(formData.startTime, time)
                                  return (
                                    <SelectItem
                                      key={time}
                                      value={time}
                                      disabled={!isAvailable}
                                      className={!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                      {time} ({durationText}) {!isAvailable && '- Conflicts with booking'}
                                    </SelectItem>
                                  )
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Time validation error */}
                      {timeError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600">{timeError}</p>
                        </div>
                      )}

                      {/* Duration and cost preview */}
                      {formData.startTime && formData.endTime && !timeError && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-green-800">
                                {formData.startTime} - {formData.endTime}
                              </div>
                              <div className="text-xs text-green-600">
                                Duration: {(() => {
                                  const duration = calculateDuration(formData.startTime, formData.endTime)
                                  return duration === 1 ? '1 hour' :
                                         duration === 1.5 ? '1.5 hours' :
                                         `${duration} hours`
                                })()}
                              </div>
                            </div>
                            {selectedGame && (
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                  ₹{estimatedCost}
                                </div>
                                <div className="text-xs text-green-600">
                                  @ ₹{selectedGame.price_per_hour}/hour
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Existing bookings info */}
                      {formData.bookingDate && existingBookings.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="text-sm font-medium text-amber-800 mb-2 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Unavailable time slots for this date:
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {existingBookings.map((booking, index) => (
                              <div key={index} className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                {booking.start_time} - {booking.end_time}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-amber-600 mt-2">
                            These times are greyed out in the dropdowns above
                          </div>
                        </div>
                      )}

                      {/* No conflicts message */}
                      {formData.bookingDate && existingBookings.length === 0 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="text-sm text-green-700 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            All time slots are available for this date
                          </div>
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
                        disabled={submitting || !formData.gameId || !formData.bookingDate || !formData.startTime || !formData.endTime || !!timeError}
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
                            <div className="text-green-600 text-xs">
                              Duration: {(() => {
                                const duration = calculateDuration(formData.startTime, formData.endTime)
                                return duration === 1 ? '1 hour' :
                                       duration === 1.5 ? '1.5 hours' :
                                       `${duration} hours`
                              })()}
                            </div>
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
