SELECT id, name, email, email_verified, image, password, verification_token, created_at, updated_at
	FROM public.users;

	-- Add role (default 'trader') if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'trader';

-- Add profile-related fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_style TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_experience TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
