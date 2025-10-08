-- Add rejection_reason column to certification_requests table
ALTER TABLE public.certification_requests 
ADD COLUMN rejection_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.certification_requests.rejection_reason IS 'Reason provided by COE when rejecting a certification request';