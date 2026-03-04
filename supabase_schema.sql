-- IPSCHEDULA DATABASE SCHEMA (Updated RLS)

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  nickname TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

-- 2. FRIENDSHIPS
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Select: Both parties can see the request
CREATE POLICY "Users can view their own friendships" 
ON public.friendships FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Insert: Anyone can start a request
CREATE POLICY "Users can insert friend requests" 
ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- Update: Both parties can update (Addressee accepts, Requester re-sends)
CREATE POLICY "Users can update their friendships" 
ON public.friendships FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id)
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Delete: Either party can cancel/remove
CREATE POLICY "Users can delete their friendships" 
ON public.friendships FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
