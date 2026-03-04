import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://svnnopsluodcsgqncmbq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bm5vcHNsdW9kY3NncW5jbWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjM0NTcsImV4cCI6MjA4ODE5OTQ1N30.A0qXlQftDZ3PqZpQ-vua0ABMagWWGnvlMp5yMftfI_w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
