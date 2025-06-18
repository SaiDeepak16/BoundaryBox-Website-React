'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Edit } from 'lucide-react'
import { gameService } from '@/lib/game-service'
import { useToast } from '@/hooks/use-toast'

interface Game {
  id: string
  name: string
  description: string
  price_per_hour: number
  max_players: number
}

interface EditGameModalProps {
  game: Game | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onGameUpdated: () => void
}

export function EditGameModal({ game, open, onOpenChange, onGameUpdated }: EditGameModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_hour: '',
    max_players: ''
  })

  useEffect(() => {
    if (game) {
      setFormData({
        name: game.name,
        description: game.description,
        price_per_hour: game.price_per_hour.toString(),
        max_players: game.max_players.toString()
      })
    }
  }, [game])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!game) return

    if (!formData.name || !formData.description || !formData.price_per_hour || !formData.max_players) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      })
      return
    }

    const pricePerHour = parseFloat(formData.price_per_hour)
    const maxPlayers = parseInt(formData.max_players)

    if (isNaN(pricePerHour) || pricePerHour <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price per hour",
        variant: "destructive"
      })
      return
    }

    if (isNaN(maxPlayers) || maxPlayers <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of max players",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const { error } = await gameService.updateGame(game.id, {
        name: formData.name,
        description: formData.description,
        price_per_hour: pricePerHour,
        max_players: maxPlayers
      })

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Game updated successfully"
      })

      onOpenChange(false)
      onGameUpdated()
    } catch (error: any) {
      console.error('Error updating game:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update game",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            Edit Game
          </DialogTitle>
          <DialogDescription>
            Update the game details below. Changes will be applied immediately.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Game Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Cricket, Carrom, Badminton"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the game and what's included..."
                rows={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price per Hour (₹) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price_per_hour}
                  onChange={(e) => handleInputChange('price_per_hour', e.target.value)}
                  placeholder="500"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-players">Max Players *</Label>
                <Input
                  id="edit-players"
                  type="number"
                  min="1"
                  value={formData.max_players}
                  onChange={(e) => handleInputChange('max_players', e.target.value)}
                  placeholder="22"
                  required
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
