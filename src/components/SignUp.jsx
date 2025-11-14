import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMail, IoLockClosed, IoEye, IoEyeOff, IoArrowBack } from 'react-icons/io5';
import { GiTomato } from 'react-icons/gi';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setMessage('Success! Check your email to confirm your account.');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='signup-page-modern'>
      <button onClick={() => navigate('/')} className='signup-back-btn-modern'>
        <IoArrowBack size={20} />
        <span>Back</span>
      </button>

      <div className='signup-container-modern'>
        <div className='signup-branding-modern'>
          <GiTomato size={56} className='signup-logo' />
          <h1>Pomodoro Pro</h1>
        </div>

        <div className='signup-card-modern'>
          <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className='signup-subtitle-modern'>
            {isSignUp
              ? 'Get started for free. No credit card required.'
              : 'Sign in to continue your productivity journey'}
          </p>

          {message && <div className='auth-success'>{message}</div>}
          {error && <div className='auth-error'>{error}</div>}

          <form onSubmit={handleSubmit} className='signup-form-modern'>
            <div className='auth-input-wrapper-modern'>
              <IoMail className='auth-input-icon-modern' size={20} />
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='Email address'
                required
                disabled={loading}
              />
            </div>

            <div className='auth-input-wrapper-modern'>
              <IoLockClosed className='auth-input-icon-modern' size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Password'
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='auth-toggle-password-modern'
              >
                {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
              </button>
            </div>

            {isSignUp && (
              <div className='auth-input-wrapper-modern'>
                <IoLockClosed className='auth-input-icon-modern' size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='Confirm password'
                  required
                  disabled={loading}
                />
              </div>
            )}

            <button
              type='submit'
              className='signup-submit-btn-modern'
              disabled={loading}
            >
              {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className='signup-divider-modern'>
            <span>or</span>
          </div>

          <button
            type='button'
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className='signup-toggle-btn-modern'
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        <p className='signup-footer-modern'>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default SignUp;
