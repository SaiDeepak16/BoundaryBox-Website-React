-- Add phone number support to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

-- Update existing profiles with placeholder phone numbers (you'll need to update these manually)
UPDATE public.profiles 
SET phone = '+91' || LPAD((ROW_NUMBER() OVER())::text, 10, '0')
WHERE phone IS NULL;

-- Make phone column NOT NULL after updating existing records
ALTER TABLE public.profiles 
ALTER COLUMN phone SET NOT NULL;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Update booking status enum to include 'completed'
-- Note: This might require manual intervention if there are existing bookings
-- ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'completed';

-- Update or create the profile creation trigger to handle phone numbers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '+91' || LPAD((EXTRACT(EPOCH FROM NOW())::bigint % 10000000000)::text, 10, '0')),
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to free up booking slots when status changes to canceled or no_show
CREATE OR REPLACE FUNCTION free_booking_slot()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking status changed to canceled, no_show, or completed
  -- we don't need to do anything special as the slot is automatically available
  -- when status is not 'confirmed' or 'pending'

  -- Log the status change for audit purposes
  INSERT INTO public.booking_audit_log (
    booking_id,
    old_status,
    new_status,
    changed_by,
    changed_at,
    notes
  ) VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    auth.uid(),
    NOW(),
    CASE
      WHEN NEW.status = 'canceled' THEN 'Booking canceled - slot freed'
      WHEN NEW.status = 'no_show' THEN 'Marked as no-show - slot freed'
      WHEN NEW.status = 'completed' THEN 'Booking completed'
      ELSE 'Status updated'
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for booking status changes
CREATE TABLE IF NOT EXISTS public.booking_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.booking_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to read audit logs
CREATE POLICY "Admins can read booking audit logs" ON public.booking_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for booking status changes
DROP TRIGGER IF EXISTS booking_status_change_trigger ON public.bookings;
CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION free_booking_slot();

-- Update the check_booking_conflict function to exclude canceled, no_show, and completed bookings
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_game_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM bookings
  WHERE game_id = p_game_id
    AND booking_date = p_booking_date
    AND status IN ('pending', 'confirmed') -- Only check active bookings
    AND (
      (start_time::TIME < p_end_time AND end_time::TIME > p_start_time)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;
