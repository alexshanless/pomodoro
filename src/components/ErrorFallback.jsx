import React from 'react';
import { IoWarning, IoRefresh, IoHome } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';

/**
 * Error Fallback UI Component
 * Displays a user-friendly error message when an error is caught by ErrorBoundary
 */
const ErrorFallback = ({ error, errorInfo, onReset }) => {
  const navigate = useNavigate();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleGoHome = () => {
    onReset();
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="error-fallback-container">
      <div className="error-fallback-content">
        <div className="error-icon">
          <IoWarning size={80} />
        </div>

        <h1>Oops! Something went wrong</h1>

        <p className="error-message">
          We encountered an unexpected error. Don't worry, your data is safe.
        </p>

        <div className="error-actions">
          <button
            onClick={onReset}
            className="btn-primary error-btn"
          >
            <IoRefresh size={20} />
            Try Again
          </button>

          <button
            onClick={handleGoHome}
            className="btn-secondary error-btn"
          >
            <IoHome size={20} />
            Go Home
          </button>

          <button
            onClick={handleReload}
            className="btn-secondary error-btn"
          >
            <IoRefresh size={20} />
            Reload Page
          </button>
        </div>

        {isDevelopment && error && (
          <details className="error-details">
            <summary>Error Details (Development Mode)</summary>
            <div className="error-stack">
              <p><strong>Error:</strong> {error.toString()}</p>
              {errorInfo && errorInfo.componentStack && (
                <pre>{errorInfo.componentStack}</pre>
              )}
            </div>
          </details>
        )}

        <p className="error-help-text">
          If this problem persists, please try clearing your browser cache or contact support.
        </p>
      </div>
    </div>
  );
};

export default ErrorFallback;
