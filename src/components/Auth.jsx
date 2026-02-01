import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IoClose, IoMail, IoLockClosed, IoEye, IoEyeOff } from 'react-icons/io5';
import '../App.css';

const Auth = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Handle forgot password flow
    if (isForgotPassword) {
      if (!email) {
        setError('Please enter your email');
        setLoading(false);
        return;
      }

      try {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setMessage('Password reset email sent! Check your inbox.');
        setEmail('');
        // Return to sign in after 3 seconds
        setTimeout(() => {
          setIsForgotPassword(false);
          setMessage('');
        }, 3000);
      } catch (error) {
        setError(error.message || 'Failed to send reset email');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation for sign in/sign up
    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage('Success! Check your email to confirm your account.');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setMessage('Welcome back!');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (error) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    // If user is trying to sign up, navigate to /signup page
    if (!isSignUp) {
      onClose();
      navigate('/signup');
    } else {
      // If on sign up mode, just toggle back to sign in
      setIsSignUp(false);
      setError('');
      setMessage('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setIsSignUp(false);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleBackToSignIn = () => {
    setIsForgotPassword(false);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className='auth-modal-overlay' onClick={onClose}>
      <div className='auth-modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='close-modal-btn' onClick={onClose}>
          <IoClose size={24} />
        </button>

        <div className='auth-modal-header'>
          <h2>{isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isForgotPassword ? 'Enter your email to receive a password reset link' : isSignUp ? 'Sign up to sync your data across devices' : 'Sign in to access your account'}</p>
        </div>

        <form className='auth-form' onSubmit={handleSubmit}>
          {error && <div className='auth-error'>{error}</div>}
          {message && <div className='auth-success'>{message}</div>}

          <div className='auth-input-group'>
            <label htmlFor='email'>Email</label>
            <div className='auth-input-wrapper'>
              <IoMail className='auth-input-icon' />
              <input
                id='email'
                type='email'
                placeholder='Enter your email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          {!isForgotPassword && (
            <>
              <div className='auth-input-group'>
                <label htmlFor='password'>Password</label>
                <div className='auth-input-wrapper'>
                  <IoLockClosed className='auth-input-icon' />
                  <input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Enter your password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type='button'
                    className='auth-toggle-password'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className='auth-input-group'>
                  <label htmlFor='confirmPassword'>Confirm Password</label>
                  <div className='auth-input-wrapper'>
                    <IoLockClosed className='auth-input-icon' />
                    <input
                      id='confirmPassword'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Confirm your password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {!isForgotPassword && !isSignUp && (
            <div className='auth-forgot-password'>
              <button
                type='button'
                className='auth-forgot-password-btn'
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type='submit'
            className='auth-submit-btn'
            disabled={loading}
          >
            {loading ? 'Please wait...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className='auth-footer'>
          {isForgotPassword ? (
            <p>
              Remember your password?
              {' '}
              <button
                type='button'
                className='auth-toggle-mode-btn'
                onClick={handleBackToSignIn}
                disabled={loading}
              >
                Back to Sign In
              </button>
            </p>
          ) : (
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button
                type='button'
                className='auth-toggle-mode-btn'
                onClick={toggleMode}
                disabled={loading}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
