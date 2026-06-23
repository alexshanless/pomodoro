import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword } from '../utils/validation';
import '../styles/SignUpRedesign.css';

const TomatoMark = () => (
  <svg viewBox='0 0 32 32' fill='none' aria-hidden='true'>
    <path
      d='M16 6c-1 0-1.8.5-2.4 1.2C12.4 6.3 10.6 6 9 6.6c2 .4 3.2 1.4 3.8 2.2A10 10 0 1 0 21 9c.6-.9 1.9-1.9 4-2.3-1.7-.7-3.6-.3-4.8.7C19.7 6.4 18.9 6 18 6h-2z'
      fill='var(--ps-tomato)'
    />
    <path d='M16 5.5c.3-1.2 1.4-2.3 3-2.6' stroke='#4fd47a' strokeWidth='1.6' strokeLinecap='round' />
    <ellipse cx='12.4' cy='15.5' rx='2.1' ry='3' fill='rgba(255,255,255,0.28)' />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z' />
    <circle cx='12' cy='12' r='3' />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' />
    <path d='M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61' />
    <path d='M14.12 14.12A3 3 0 1 1 9.88 9.88M1 1l22 22' />
  </svg>
);

const LockIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <rect x='3' y='11' width='18' height='11' rx='2' />
    <path d='M7 11V7a5 5 0 0 1 10 0v4' />
  </svg>
);

const STRENGTH_MSG = [
  'Use 8+ characters with letters and numbers.',
  'Weak — add length and variety.',
  'Fair — getting there.',
  'Good password.',
  'Strong password.',
];

const scorePassword = (value) => {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return score;
};

const FEATURES = [
  {
    cls: 'ic-foc',
    title: 'Track your focus',
    desc: 'Use the proven Pomodoro technique to stay productive and avoid burnout.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <circle cx='12' cy='13' r='8' />
        <path d='M12 9v4l2.5 2.5' />
        <path d='M9 2h6' />
      </svg>
    ),
  },
  {
    cls: 'ic-prog',
    title: 'Visualize progress',
    desc: 'Clean charts and analytics surface your productivity trends over time.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <line x1='18' y1='20' x2='18' y2='10' />
        <line x1='12' y1='20' x2='12' y2='4' />
        <line x1='6' y1='20' x2='6' y2='14' />
      </svg>
    ),
  },
  {
    cls: 'ic-proj',
    title: 'Manage projects',
    desc: 'Organize work into projects and track the time spent on each one.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='7' width='18' height='13' rx='2' />
        <path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
      </svg>
    ),
  },
  {
    cls: 'ic-fin',
    title: 'Financial tracking',
    desc: 'Track earnings and expenses for every project in one place.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='2' y='6' width='20' height='13' rx='3' />
        <path d='M16 12h2' />
        <path d='M2 9h16a2 2 0 0 1 2 2' />
      </svg>
    ),
  },
  {
    cls: 'ic-sync',
    title: 'Cloud sync',
    desc: 'Access your data from any device, always in sync.',
    icon: (
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.6-1.4A4 4 0 0 0 7 19z' />
      </svg>
    ),
  },
];

const GoogleLogo = () => (
  <svg viewBox='0 0 18 18' width='18' height='18' aria-hidden='true'>
    <path fill='#4285F4' d='M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z' />
    <path fill='#34A853' d='M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z' />
    <path fill='#FBBC05' d='M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z' />
    <path fill='#EA4335' d='M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z' />
  </svg>
);

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const strength = useMemo(() => scorePassword(password), [password]);

  const handleGoogle = async () => {
    setError('');
    setMessage('');
    const { error } = await signInWithGoogle();
    if (error) setError(error.message || 'Google sign-in failed');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || !password) {
      setError('Enter your email and a password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }

    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) {
      setError(pwValidation.errors[0]);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) throw error;
      setMessage('Success! Check your email to confirm your account.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='pompay-signup'>
      <div className='ps-wrap'>
        <button type='button' className='ps-back' onClick={() => navigate('/')}>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M19 12H5M11 6l-6 6 6 6' />
          </svg>
          Back
        </button>

        <div className='ps-cols'>
          <section className='ps-pitch'>
            <div className='ps-logo'>
              <TomatoMark />
            </div>
            <h1>
              Focus,
              <br />
              tracked &amp; paid.
            </h1>
            <p className='ps-lede'>
              pompay turns the Pomodoro technique into deep work you can measure — and bill — across every project.
            </p>

            <div className='ps-features'>
              {FEATURES.map((f) => (
                <div className='ps-feat' key={f.title}>
                  <span className={`ps-ficon ${f.cls}`}>{f.icon}</span>
                  <div className='ps-ftxt'>
                    <div className='ps-ft'>{f.title}</div>
                    <div className='ps-fs'>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <p className='ps-quip'>Join thousands of focused people already hitting their goals.</p>
          </section>

          <section className='ps-card'>
            <h2>Create your account</h2>
            <p className='ps-sub'>Get started for free. No credit card required.</p>

            <form className='ps-form' onSubmit={handleSubmit} noValidate>
              <div className='ps-field'>
                <label htmlFor='su-email'>Email</label>
                <div className='ps-inputwrap'>
                  <input
                    id='su-email'
                    type='email'
                    placeholder='you@example.com'
                    autoComplete='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                  <span className='ps-lead'>
                    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <rect x='3' y='5' width='18' height='14' rx='2' />
                      <path d='m3 7 9 6 9-6' />
                    </svg>
                  </span>
                </div>
              </div>

              <div className='ps-field'>
                <label htmlFor='su-pass'>Password</label>
                <div className='ps-inputwrap'>
                  <input
                    id='su-pass'
                    type={showPassword ? 'text' : 'password'}
                    className='has-peek'
                    placeholder='Create a password'
                    autoComplete='new-password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <span className='ps-lead'>
                    <LockIcon />
                  </span>
                  <button
                    type='button'
                    className='ps-peek'
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <div className={`ps-meter${strength ? ` s${strength}` : ''}`}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className='ps-meter-label'>{STRENGTH_MSG[strength]}</div>
              </div>

              <div className='ps-field'>
                <label htmlFor='su-confirm'>Confirm password</label>
                <div className='ps-inputwrap'>
                  <input
                    id='su-confirm'
                    type={showConfirm ? 'text' : 'password'}
                    className='has-peek'
                    placeholder='Re-enter your password'
                    autoComplete='new-password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <span className='ps-lead'>
                    <LockIcon />
                  </span>
                  <button
                    type='button'
                    className='ps-peek'
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div className='ps-msg ps-err'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='9' />
                    <path d='M12 8v4M12 16h.01' />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              {message && (
                <div className='ps-msg ps-ok'>
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                    <circle cx='12' cy='12' r='9' />
                    <path d='m8.5 12 2.5 2.5 4.5-5' />
                  </svg>
                  <span>{message}</span>
                </div>
              )}

              <button type='submit' className='ps-btn ps-btn-create' disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>

            <div className='ps-divider'>or</div>

            <button type='button' className='ps-alt ps-google' onClick={handleGoogle} disabled={loading}>
              <GoogleLogo />Continue with Google
            </button>

            <button type='button' className='ps-alt' onClick={() => navigate('/signin')}>
              Already have an account?&nbsp;<b>Sign in</b>
            </button>

            <p className='ps-legal'>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
