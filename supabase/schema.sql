-- Add is_featured column to topics table
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Update existing policies if needed (usually not required for simple column additions)