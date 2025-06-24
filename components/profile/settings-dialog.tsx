'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Settings, User, Lock, Eye, EyeOff } from 'lucide-react'
import { authService } from '@/lib/auth'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  
  // Name update state
  const [newName, setNewName] = useState(profile?.name || '')
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  
  // Password update state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!profile) return null

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive"
      })
      return
    }

    if (newName === profile.name) {
      toast({
        title: "Info",
        description: "Name is already up to date",
      })
      return
    }

    try {
      setIsUpdatingName(true)
      const { error } = await authService.updateProfile(profile.id, { name: newName })
      
      if (error) throw error

      toast({
        title: "Success",
        description: "Name updated successfully"
      })
      
      // Refresh the page to update the profile data
      window.location.reload()
    } catch (error) {
      console.error('Error updating name:', error)
      toast({
        title: "Error",
        description: "Failed to update name",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Both password fields are required",
        variant: "destructive"
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive"
      })
      return
    }

    try {
      setIsUpdatingPassword(true)

      // Update password - Supabase requires active session for security
      const { error } = await authService.updatePassword(newPassword)
      if (error) {
        toast({
          title: "Error",
          description: (error as any)?.message || "Failed to update password",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Success",
        description: "Password updated successfully"
      })

      // Clear form
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error updating password:', error)
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Update your account information and security settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Update Name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <User className="h-4 w-4 mr-2" />
                Update Name
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <Button 
                onClick={handleUpdateName}
                disabled={isUpdatingName || newName === profile.name}
                className="w-full"
              >
                {isUpdatingName ? 'Updating...' : 'Update Name'}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Update Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg">
                <p>You're currently signed in securely. Enter your new password below to update it.</p>
              </div>

              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="w-full"
                variant="outline"
              >
                {isUpdatingPassword ? 'Updating...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
