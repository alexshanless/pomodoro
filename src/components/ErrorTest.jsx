import React, { useState } from 'react';

/**
 * Test component to verify Error Boundary works
 * INSTRUCTIONS:
 * 1. Import this component in App.js: import ErrorTest from './components/ErrorTest';
 * 2. Add route: <Route path="/error-test" element={<ErrorTest />} />
 * 3. Navigate to /error-test
 * 4. Click "Trigger Error" button
 * 5. Verify ErrorBoundary catches the error and shows fallback UI
 * 6. Remove this component and route after testing
 */
const ErrorTest = () => {
  const [throwError, setThrowError] = useState(false);

  if (throwError) {
    // This will trigger the Error Boundary
    throw new Error('Test error: Error Boundary is working correctly!');
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      color: '#fff'
    }}>
      <h1>Error Boundary Test Page</h1>
      <p>Click the button below to intentionally trigger an error and test the Error Boundary.</p>

      <button
        onClick={() => setThrowError(true)}
        style={{
          padding: '1rem 2rem',
          fontSize: '1rem',
          fontWeight: 'bold',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          marginTop: '1rem'
        }}
      >
        Trigger Error
      </button>

      <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#9ca3af' }}>
        <p><strong>Expected behavior:</strong></p>
        <ul>
          <li>Error Boundary catches the error</li>
          <li>Fallback UI is displayed</li>
          <li>User sees "Try Again", "Go Home", and "Reload Page" buttons</li>
          <li>In development mode, error details are shown</li>
        </ul>
      </div>
    </div>
  );
};

export default ErrorTest;
