import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcymxvgjyaefwolgvpxp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjeW14dmdqeWFlZndvbGd2cHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDQwMzYsImV4cCI6MjA4MzY4MDAzNn0.YH7QDLIU0jxus8TEO5SCLa7Oq7xVIXaoYVvbh8ubVcM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
