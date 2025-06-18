'use client'

import { useState } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Trophy, Plus } from 'lucide-react'
import { gameService } from '@/lib/game-service'
import { useToast } from '@/hooks/use-toast'

interface AddGameModalProps {
  onGameAdded: () => void
}

export function AddGameModal({ onGameAdded }: AddGameModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_per_hour: '',
    max_players: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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

      const { error } = await gameService.createGame({
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
        description: "Game added successfully"
      })

      // Reset form
      setFormData({
        name: '',
        description: '',
        price_per_hour: '',
        max_players: ''
      })

      setOpen(false)
      onGameAdded()
    } catch (error: any) {
      console.error('Error adding game:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to add game",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2" />
            Add New Game
          </DialogTitle>
          <DialogDescription>
            Add a new game to your booking system. Fill in all the details below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Game Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Cricket, Carrom, Badminton"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the game and what's included..."
                rows={3}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price per Hour (₹) *</Label>
                <Input
                  id="price"
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
                <Label htmlFor="players">Max Players *</Label>
                <Input
                  id="players"
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
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Game'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
