'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Clock, Calendar, User, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import { bookingService } from '@/lib/booking-service'
import { useToast } from '@/hooks/use-toast'

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
  }
}

interface PendingRequestsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestsUpdated: () => void
}

export function PendingRequestsModal({ open, onOpenChange, onRequestsUpdated }: PendingRequestsModalProps) {
  const { toast } = useToast()
  const [pendingBookings, setPendingBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchPendingBookings()
    }
  }, [open])

  const fetchPendingBookings = async () => {
    try {
      setLoading(true)
      
      const { data } = await bookingService.getPendingBookings()
      if (data) {
        setPendingBookings(data as BookingWithDetails[])
      }
    } catch (error) {
      console.error('Error fetching pending bookings:', error)
      toast({
        title: "Error",
        description: "Failed to load pending requests",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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
      
      // Remove from pending list
      setPendingBookings(prev => prev.filter(b => b.id !== bookingId))
      onRequestsUpdated()
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
      
      // Remove from pending list
      setPendingBookings(prev => prev.filter(b => b.id !== bookingId))
      onRequestsUpdated()
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Pending Booking Requests
          </DialogTitle>
          <DialogDescription>
            Review and approve or reject pending booking requests from users.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading pending requests...</p>
            </div>
          ) : pendingBookings.length > 0 ? (
            pendingBookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{booking.game?.name}</h4>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Pending
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <div>
                          <p className="font-medium">{booking.user?.name}</p>
                          <p className="text-xs">{booking.user?.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(booking.booking_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
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
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Notes:</strong> {booking.notes}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Requested: {new Date(booking.created_at).toLocaleDateString()} at {new Date(booking.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleApproveBooking(booking.id)}
                    disabled={processingId === booking.id}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {processingId === booking.id ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectBooking(booking.id)}
                    disabled={processingId === booking.id}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <h4 className="text-lg font-medium text-gray-900 mb-1">No pending requests</h4>
              <p className="text-gray-600">All booking requests have been processed.</p>
            </div>
          )}
        </div>

        {pendingBookings.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              {pendingBookings.length} pending request{pendingBookings.length !== 1 ? 's' : ''}
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
