import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthRedesign.css';

const TomatoMark = () => (
  <svg viewBox='0 0 32 32' fill='none' aria-hidden='true'>
    <path
      d='M16 6c-1 0-1.8.5-2.4 1.2C12.4 6.3 10.6 6 9 6.6c2 .4 3.2 1.4 3.8 2.2A10 10 0 1 0 21 9c.6-.9 1.9-1.9 4-2.3-1.7-.7-3.6-.3-4.8.7C19.7 6.4 18.9 6 18 6h-2z'
      fill='var(--pa-tomato)'
    />
    <path d='M16 5.5c.3-1.2 1.4-2.3 3-2.6' stroke='#4fd47a' strokeWidth='1.6' strokeLinecap='round' />
    <ellipse cx='12.4' cy='15.5' rx='2.1' ry='3' fill='rgba(255,255,255,0.28)' />
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAuth();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isForgotPassword) {
      if (!email) {
        setError('Please enter your email.');
        return;
      }
      setLoading(true);
      try {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('Password reset email sent! Check your inbox.');
        setEmail('');
        setTimeout(() => {
          setIsForgotPassword(false);
          setMessage('');
        }, 3000);
      } catch (err) {
        setError(err.message || 'Failed to send reset email');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      setMessage('Welcome back!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 900);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const goToSignUp = () => {
    navigate('/signup');
  };

  const openForgotPassword = () => {
    setIsForgotPassword(true);
    setError('');
    setMessage('');
    setPassword('');
  };

  const backToSignIn = () => {
    setIsForgotPassword(false);
    setError('');
    setMessage('');
  };

  return (
    <div className='pompay-auth'>
      <section className='pa-card'>
        <div className='pa-logo'>
          <TomatoMark />
        </div>
        <h1>{isForgotPassword ? 'Reset password' : 'Welcome back'}</h1>
        <p className='pa-sub'>
          {isForgotPassword
            ? 'Enter your email and we’ll send you a reset link.'
            : 'Sign in to pick up where you left off.'}
        </p>

        <form className='pa-form' onSubmit={handleSubmit} noValidate>
          <div className='pa-field'>
            <label htmlFor='si-email'>Email</label>
            <div className='pa-inputwrap'>
              <input
                id='si-email'
                type='email'
                placeholder='you@example.com'
                autoComplete='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <span className='pa-lead'>
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <rect x='3' y='5' width='18' height='14' rx='2' />
                  <path d='m3 7 9 6 9-6' />
                </svg>
              </span>
            </div>
          </div>

          {!isForgotPassword && (
            <div className='pa-field'>
              <div className='pa-field-row'>
                <label htmlFor='si-pass'>Password</label>
                <button type='button' className='pa-forgot' onClick={openForgotPassword} disabled={loading}>
                  Forgot password?
                </button>
              </div>
              <div className='pa-inputwrap'>
                <input
                  id='si-pass'
                  type={showPassword ? 'text' : 'password'}
                  className='has-peek'
                  placeholder='Enter your password'
                  autoComplete='current-password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <span className='pa-lead'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                    <rect x='3' y='11' width='18' height='11' rx='2' />
                    <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                  </svg>
                </span>
                <button
                  type='button'
                  className='pa-peek'
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' />
                      <path d='M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61' />
                      <path d='M14.12 14.12A3 3 0 1 1 9.88 9.88M1 1l22 22' />
                    </svg>
                  ) : (
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' />
                      <circle cx='12' cy='12' r='3' />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className='pa-msg pa-err'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='9' />
                <path d='M12 8v4M12 16h.01' />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className='pa-msg pa-ok'>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='9' />
                <path d='m8.5 12 2.5 2.5 4.5-5' />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {!isForgotPassword && (
            <label className='pa-remember'>
              <input type='checkbox' defaultChecked />
              <span className='pa-box'>
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
                  <polyline points='20 6 9 17 4 12' />
                </svg>
              </span>
              <span className='pa-rl'>Keep me signed in</span>
            </label>
          )}

          <button type='submit' className='pa-btn pa-btn-primary' disabled={loading}>
            {loading
              ? isForgotPassword
                ? 'Sending…'
                : 'Signing in…'
              : isForgotPassword
                ? 'Send reset link'
                : 'Sign in'}
          </button>
        </form>

        <div className='pa-divider'>or</div>

        {isForgotPassword ? (
          <button type='button' className='pa-alt' onClick={backToSignIn} disabled={loading}>
            Remember your password?&nbsp;<b>Back to sign in</b>
          </button>
        ) : (
          <button type='button' className='pa-alt' onClick={goToSignUp}>
            New to pompay?&nbsp;<b>Create an account</b>
          </button>
        )}
      </section>
    </div>
  );
};

export default Auth;
