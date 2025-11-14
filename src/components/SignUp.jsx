import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMail, IoLockClosed, IoEye, IoEyeOff, IoArrowBack, IoCheckmarkCircle } from 'react-icons/io5';
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
    {
      icon: '⏱️',
      title: 'Track Your Focus',
      description: 'Use the proven Pomodoro Technique to stay productive and avoid burnout'
    },
    {
      icon: '📊',
      title: 'Visualize Progress',
      description: 'Beautiful charts and analytics to see your productivity trends over time'
    },
    {
      icon: '💼',
      title: 'Manage Projects',
      description: 'Organize your work into projects and track time spent on each one'
    },
    {
      icon: '💰',
      title: 'Financial Tracking',
      description: 'Track earnings and expenses for each project in one place'
    },
    {
      icon: '☁️',
      title: 'Cloud Sync',
      description: 'Access your data from any device, always in sync'
    }
  ];

  return (
    <div className='signup-page-two-column'>
      <button onClick={() => navigate('/')} className='signup-back-btn-two-column'>
        <IoArrowBack size={20} />
        <span>Back</span>
      </button>

      <div className='signup-container-two-column'>
        {/* Left Column - Benefits & Pitch */}
        <div className='signup-left-column'>
          <div className='signup-branding-left'>
            <GiTomato size={64} className='signup-logo-left' />
            <h1>Pomodoro Pro</h1>
            <p className='signup-tagline-left'>
              The ultimate productivity tool for focused work and project management
            </p>
          </div>

          <div className='signup-features-list'>
            {features.map((feature, index) => (
              <div key={index} className='signup-feature-item-two-column'>
                <div className='feature-icon'>{feature.icon}</div>
                <div className='feature-content'>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className='signup-social-proof'>
            <p>Join thousands of productive users already achieving their goals</p>
          </div>
        </div>

        {/* Right Column - Sign Up Form */}
        <div className='signup-right-column'>
          <div className='signup-form-card'>
            <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
            <p className='signup-subtitle-two-column'>
              {isSignUp
                ? 'Get started for free. No credit card required.'
                : 'Sign in to continue your productivity journey'}
            </p>

            {message && <div className='auth-success'>{message}</div>}
            {error && <div className='auth-error'>{error}</div>}

            <form onSubmit={handleSubmit} className='signup-form-two-column'>
              <div className='auth-input-wrapper-modern'>
                <IoMail className='auth-input-icon-modern' size={20} />
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='Email address'
                  required
                  disabled={loading}
                  aria-label="Email address"
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
                  aria-label="Password"
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='auth-toggle-password-modern'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                    aria-label="Confirm password"
                  />
                </div>
              )}

              <button
                type='submit'
                className='signup-submit-btn-two-column'
                disabled={loading}
              >
                {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <div className='signup-divider-two-column'>
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
              className='signup-toggle-btn-two-column'
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>

            <p className='signup-footer-two-column'>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
