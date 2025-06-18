'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Save, RotateCcw, AlertTriangle, Clock } from 'lucide-react'
import { settingsService, SystemSettings } from '@/lib/settings-service'
import { useToast } from '@/hooks/use-toast'

export function SettingsForm() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await settingsService.getSettings()
      
      if (error) {
        throw error
      }
      
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    // Validate settings
    const validation = settingsService.validateSettings(settings)
    if (!validation.isValid) {
      setErrors(validation.errors)
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      setErrors([])
      
      const { error } = await settingsService.updateSettings(settings)
      
      if (error) {
        throw error
      }
      
      toast({
        title: "Success",
        description: "Settings saved successfully"
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      setErrors([])
      
      const { data, error } = await settingsService.resetToDefaults()
      
      if (error) {
        throw error
      }
      
      setSettings(data)
      toast({
        title: "Success",
        description: "Settings reset to defaults"
      })
    } catch (error) {
      console.error('Error resetting settings:', error)
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (!settings) return
    setSettings(prev => prev ? { ...prev, [key]: value } : null)
    setErrors([]) // Clear errors when user makes changes
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>Configure your booking system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>Configure your booking system</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load settings. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5" />
          System Settings
        </CardTitle>
        <CardDescription>Configure your booking system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Operating Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Operating Hours</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="24-7-toggle" className="text-sm font-medium">
                24/7 Operation
              </Label>
              <Switch
                id="24-7-toggle"
                checked={settings.is_24_7}
                onCheckedChange={(checked) => updateSetting('is_24_7', checked)}
              />
            </div>
          </div>

          {!settings.is_24_7 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening-time">Opening Time</Label>
                <Input
                  id="opening-time"
                  type="time"
                  value={settings.opening_time}
                  onChange={(e) => updateSetting('opening_time', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-time">Closing Time</Label>
                <Input
                  id="closing-time"
                  type="time"
                  value={settings.closing_time}
                  onChange={(e) => updateSetting('closing_time', e.target.value)}
                />
              </div>
            </div>
          )}

          {settings.is_24_7 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-800">24/7 Operation Enabled</p>
                  <p className="text-xs text-blue-600">
                    Users can book any time of day, including overnight slots (e.g., 11:00 PM - 5:00 AM)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Booking Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Booking Configuration</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advance-days">Advance Booking (Days)</Label>
              <Input
                id="advance-days"
                type="number"
                min="1"
                max="30"
                value={settings.advance_booking_days}
                onChange={(e) => updateSetting('advance_booking_days', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slot-duration">Time Slot Duration</Label>
              <Select
                value={settings.booking_slot_duration.toString()}
                onValueChange={(value) => updateSetting('booking_slot_duration', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-duration">Minimum Booking Duration (Hours)</Label>
              <Input
                id="min-duration"
                type="number"
                min="0.5"
                max="8"
                step="0.5"
                value={settings.min_booking_duration}
                onChange={(e) => updateSetting('min_booking_duration', parseFloat(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-duration">Maximum Booking Duration (Hours)</Label>
              <Input
                id="max-duration"
                type="number"
                min="1"
                max="12"
                step="0.5"
                value={settings.max_booking_duration}
                onChange={(e) => updateSetting('max_booking_duration', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-deadline">Cancellation Deadline (Hours Before)</Label>
            <Input
              id="cancellation-deadline"
              type="number"
              min="0"
              max="48"
              value={settings.cancellation_deadline}
              onChange={(e) => updateSetting('cancellation_deadline', parseInt(e.target.value))}
            />
          </div>
        </div>

        <Separator />

        {/* System Policies */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">System Policies</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Admin Approval</Label>
                <p className="text-sm text-gray-600">All bookings need admin approval before confirmation</p>
              </div>
              <Switch
                checked={settings.require_admin_approval}
                onCheckedChange={(checked) => updateSetting('require_admin_approval', checked)}
              />
            </div>
            

          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
