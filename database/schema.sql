-- Business Startup Guide Database Schema
-- Run these commands in your Supabase SQL Editor

-- Enable Row Level Security on auth.users (if not already enabled)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create user_progress table for business guide progress
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  province text NOT NULL,
  industry text NOT NULL DEFAULT 'general',
  hiring text NOT NULL DEFAULT 'no',
  revenue text NOT NULL DEFAULT 'gte30',
  completed jsonb DEFAULT '{}',
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure one progress record per user
  UNIQUE(user_id)
);

-- Enable RLS on user_progress table
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- User progress RLS policies
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create progress history table for tracking changes
CREATE TABLE IF NOT EXISTS progress_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  progress_snapshot jsonb NOT NULL,
  change_description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on progress_history table
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;

-- Progress history RLS policies
CREATE POLICY "Users can view their own progress history" ON progress_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress history" ON progress_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Triggers to update updated_at on user_progress
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Function to save progress history when progress is updated
CREATE OR REPLACE FUNCTION public.save_progress_history()
RETURNS trigger AS $$
BEGIN
  -- Only save history if there are actual changes to the progress data
  IF (OLD.province != NEW.province OR 
      OLD.industry != NEW.industry OR 
      OLD.hiring != NEW.hiring OR 
      OLD.revenue != NEW.revenue OR 
      OLD.completed != NEW.completed) THEN
    
    INSERT INTO public.progress_history (user_id, progress_snapshot, change_description)
    VALUES (
      NEW.user_id,
      jsonb_build_object(
        'province', NEW.province,
        'industry', NEW.industry,
        'hiring', NEW.hiring,
        'revenue', NEW.revenue,
        'completed', NEW.completed,
        'version', NEW.version
      ),
      'Progress updated'
    );
    
    -- Increment version number
    NEW.version = COALESCE(OLD.version, 0) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to save progress history
DROP TRIGGER IF EXISTS save_progress_history_trigger ON user_progress;
CREATE TRIGGER save_progress_history_trigger
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE PROCEDURE public.save_progress_history();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_history_user_id ON progress_history(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_history_created_at ON progress_history(created_at);

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profile information';
COMMENT ON TABLE user_progress IS 'User business guide progress data';
COMMENT ON TABLE progress_history IS 'Historical snapshots of user progress';

-- Grant necessary permissions (should be automatic with RLS but explicit is better)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_progress TO authenticated;
GRANT ALL ON public.progress_history TO authenticated;