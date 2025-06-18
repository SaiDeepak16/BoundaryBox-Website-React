import { supabase } from './supabase'

export interface SystemSettings {
  id?: string
  opening_time: string
  closing_time: string
  is_24_7: boolean // 24/7 operation toggle
  advance_booking_days: number
  require_admin_approval: boolean
  booking_slot_duration: number // in minutes
  min_booking_duration: number // in hours
  max_booking_duration: number // in hours
  cancellation_deadline: number // hours before booking
  created_at?: string
  updated_at?: string
}

export class SettingsService {
  // Get current system settings
  async getSettings(): Promise<{ data: SystemSettings | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      // Return default settings if none exist
      if (!data) {
        const defaultSettings: SystemSettings = {
          opening_time: '06:00',
          closing_time: '22:00',
          is_24_7: false,
          advance_booking_days: 7,
          require_admin_approval: true,
          booking_slot_duration: 30,
          min_booking_duration: 1,
          max_booking_duration: 4,
          cancellation_deadline: 2
        }
        return { data: defaultSettings, error: null }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Error fetching settings:', error)
      return { data: null, error }
    }
  }

  // Update system settings
  async updateSettings(settings: Partial<SystemSettings>): Promise<{ data: SystemSettings | null; error: any }> {
    try {
      // First check if settings exist
      const { data: existingSettings } = await supabase
        .from('system_settings')
        .select('id')
        .single()

      let result
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('system_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSettings.id)
          .select()
          .single()
      } else {
        // Create new settings record
        result = await supabase
          .from('system_settings')
          .insert([{
            ...settings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()
      }

      if (result.error) throw result.error
      return { data: result.data, error: null }
    } catch (error) {
      console.error('Error updating settings:', error)
      return { data: null, error }
    }
  }

  // Reset settings to defaults
  async resetToDefaults(): Promise<{ data: SystemSettings | null; error: any }> {
    const defaultSettings: Partial<SystemSettings> = {
      opening_time: '06:00',
      closing_time: '22:00',
      is_24_7: false,
      advance_booking_days: 7,
      require_admin_approval: true,
      booking_slot_duration: 30,
      min_booking_duration: 1,
      max_booking_duration: 4,
      cancellation_deadline: 2
    }

    return this.updateSettings(defaultSettings)
  }

  // Validate settings
  validateSettings(settings: Partial<SystemSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Only validate opening/closing times if not in 24/7 mode
    if (!settings.is_24_7 && settings.opening_time && settings.closing_time) {
      const openTime = new Date(`2000-01-01T${settings.opening_time}:00`)
      const closeTime = new Date(`2000-01-01T${settings.closing_time}:00`)

      if (openTime >= closeTime) {
        errors.push('Opening time must be before closing time')
      }
    }

    if (settings.advance_booking_days && (settings.advance_booking_days < 1 || settings.advance_booking_days > 30)) {
      errors.push('Advance booking days must be between 1 and 30')
    }

    if (settings.booking_slot_duration && ![15, 30, 60].includes(settings.booking_slot_duration)) {
      errors.push('Booking slot duration must be 15, 30, or 60 minutes')
    }

    if (settings.min_booking_duration && settings.max_booking_duration) {
      if (settings.min_booking_duration >= settings.max_booking_duration) {
        errors.push('Minimum booking duration must be less than maximum duration')
      }
    }

    if (settings.min_booking_duration && (settings.min_booking_duration < 0.5 || settings.min_booking_duration > 8)) {
      errors.push('Minimum booking duration must be between 0.5 and 8 hours')
    }

    if (settings.max_booking_duration && (settings.max_booking_duration < 1 || settings.max_booking_duration > 12)) {
      errors.push('Maximum booking duration must be between 1 and 12 hours')
    }

    if (settings.cancellation_deadline && (settings.cancellation_deadline < 0 || settings.cancellation_deadline > 48)) {
      errors.push('Cancellation deadline must be between 0 and 48 hours')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const settingsService = new SettingsService()
