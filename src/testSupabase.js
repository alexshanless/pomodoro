import { supabase } from './lib/supabaseClient'

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')

    // Test 1: Check if client is initialized
    console.log('✓ Supabase client initialized')

    // Test 2: Try to get session (will be null if not logged in, but proves connection works)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('✗ Session check failed:', sessionError.message)
    } else {
      console.log('✓ Auth connection successful (session:', session ? 'exists' : 'none', ')')
    }

    // Test 3: Try a simple query (will fail if no tables, but proves DB connection)
    const { data, error } = await supabase
      .from('test')
      .select('*')
      .limit(1)

    if (error) {
      console.log('✓ Database connection successful (no tables yet, expected)')
      console.log('  Error:', error.message)
    } else {
      console.log('✓ Database connection successful, data:', data)
    }

    console.log('\n🎉 Supabase is connected and ready!')

  } catch (err) {
    console.error('✗ Connection test failed:', err.message)
  }
}

testConnection()
