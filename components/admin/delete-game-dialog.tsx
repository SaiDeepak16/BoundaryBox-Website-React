'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, AlertTriangle } from 'lucide-react'
import { gameService } from '@/lib/game-service'
import { useToast } from '@/hooks/use-toast'

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
}

interface DeleteGameDialogProps {
  game: Game | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGameDeleted: () => void
}

export function DeleteGameDialog({ game, open, onOpenChange, onGameDeleted }: DeleteGameDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!game) return

    try {
      setLoading(true)

      const { error } = await gameService.deleteGame(game.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: `${game.name} has been deleted successfully`
      })

      onOpenChange(false)
      onGameDeleted()
    } catch (error: any) {
      console.error('Error deleting game:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete game",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Delete Game
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{game?.name}</strong>?
            </p>
            <p className="text-sm text-gray-600">
              This action cannot be undone. This will permanently delete the game and remove it from all future bookings.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
              <div className="flex">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Any existing bookings for this game will need to be handled manually.
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Game
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
