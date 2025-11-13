import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMail, IoLockClosed, IoEye, IoEyeOff, IoCheckmarkCircle } from 'react-icons/io5';
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

  const features = [
    'Track your pomodoro sessions',
    'Organize work into projects',
    'Monitor your productivity trends',
    'Manage project finances',
    'Sync across all devices'
  ];

  return (
    <div className='signup-page'>
      <div className='signup-container'>
        {/* Left Column - Sales Pitch */}
        <div className='signup-left'>
          <div className='signup-branding'>
            <GiTomato size={48} color='#e94560' />
            <h1>Pomodoro Pro</h1>
          </div>

          <h2>Stay focused. Track progress. Achieve more.</h2>
          <p className='signup-tagline'>
            The ultimate productivity tool that combines the Pomodoro Technique with project management and financial tracking.
          </p>

          <div className='signup-features'>
            {features.map((feature, index) => (
              <div key={index} className='signup-feature-item'>
                <IoCheckmarkCircle size={24} color='#4caf50' />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <p className='signup-footer-text'>
            Join thousands of productive users already tracking their time and achieving their goals.
          </p>
        </div>

        {/* Right Column - Sign Up Form */}
        <div className='signup-right'>
          <div className='signup-form-container'>
            <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p className='signup-subtitle'>
              {isSignUp
                ? 'Start tracking your productivity today'
                : 'Sign in to continue your journey'}
            </p>

            {message && <div className='auth-success'>{message}</div>}
            {error && <div className='auth-error'>{error}</div>}

            <form onSubmit={handleSubmit} className='signup-form'>
              <div className='auth-input-group'>
                <label>Email</label>
                <div className='auth-input-wrapper'>
                  <IoMail className='auth-input-icon' size={20} />
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='you@example.com'
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className='auth-input-group'>
                <label>Password</label>
                <div className='auth-input-wrapper'>
                  <IoLockClosed className='auth-input-icon' size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='••••••••'
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='auth-toggle-password'
                  >
                    {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className='auth-input-group'>
                  <label>Confirm Password</label>
                  <div className='auth-input-wrapper'>
                    <IoLockClosed className='auth-input-icon' size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder='••••••••'
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <button
                type='submit'
                className='auth-submit-btn'
                disabled={loading}
              >
                {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <div className='signup-toggle'>
              <p>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type='button'
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setMessage('');
                  }}
                  className='signup-toggle-btn'
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>

            <div className='signup-back'>
              <button onClick={() => navigate('/')} className='signup-back-btn'>
                ← Back to Timer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
