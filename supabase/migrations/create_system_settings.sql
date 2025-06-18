-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    opening_time TIME NOT NULL DEFAULT '06:00:00',
    closing_time TIME NOT NULL DEFAULT '22:00:00',
    advance_booking_days INTEGER NOT NULL DEFAULT 7,
    require_admin_approval BOOLEAN NOT NULL DEFAULT true,
    send_sms_notifications BOOLEAN NOT NULL DEFAULT false,
    booking_slot_duration INTEGER NOT NULL DEFAULT 30, -- in minutes
    min_booking_duration DECIMAL NOT NULL DEFAULT 1.0, -- in hours
    max_booking_duration DECIMAL NOT NULL DEFAULT 4.0, -- in hours
    cancellation_deadline INTEGER NOT NULL DEFAULT 2, -- hours before booking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read settings
CREATE POLICY "Admins can read system settings" ON public.system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update settings
CREATE POLICY "Admins can update system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert default settings
INSERT INTO public.system_settings (
    opening_time,
    closing_time,
    advance_booking_days,
    require_admin_approval,
    send_sms_notifications,
    booking_slot_duration,
    min_booking_duration,
    max_booking_duration,
    cancellation_deadline
) VALUES (
    '06:00:00',
    '22:00:00',
    7,
    true,
    false,
    30,
    1.0,
    4.0,
    2
) ON CONFLICT DO NOTHING;
