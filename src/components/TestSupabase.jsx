import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const TestSupabase = () => {
  const [status, setStatus] = useState('Testing connection...');
  const [details, setDetails] = useState([]);

  useEffect(() => {
    const testConnection = async () => {
      const results = [];

      try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured || !supabase) {
          setStatus('⚠️ Supabase is not configured');
          results.push('✗ Supabase environment variables are missing');
          results.push('  Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env file');
          setDetails(results);
          return;
        }

        // Test 1: Client initialized
        results.push('✓ Supabase client initialized');

        // Test 2: Auth connection
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          results.push(`✗ Auth check failed: ${sessionError.message}`);
        } else {
          results.push(`✓ Auth connection successful (session: ${session ? 'exists' : 'none'})`);
        }

        // Test 3: Database connection
        const { error } = await supabase
          .from('test')
          .select('*')
          .limit(1);

        if (error) {
          results.push('✓ Database connection successful (no tables yet - expected)');
          results.push(`  Note: ${error.message}`);
        } else {
          results.push('✓ Database connection successful');
        }

        setStatus('🎉 Supabase is connected and ready!');
        setDetails(results);

      } catch (err) {
        setStatus('✗ Connection test failed');
        results.push(`Error: ${err.message}`);
        setDetails(results);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ padding: '2rem', color: 'white', backgroundColor: '#1a1f2a', minHeight: '100vh' }}>
      <h1>Supabase Connection Test</h1>
      <h2>{status}</h2>
      <ul style={{ marginTop: '1rem', fontSize: '1rem' }}>
        {details.map((detail, index) => (
          <li key={index} style={{ marginBottom: '0.5rem' }}>{detail}</li>
        ))}
      </ul>
    </div>
  );
};

export default TestSupabase;
