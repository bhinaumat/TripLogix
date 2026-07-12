import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Map, 
  Wrench, 
  DollarSign, 
  LogOut, 
  Moon, 
  Sun,
  TrendingUp,
  Fuel,
  AlertTriangle,
  ShieldAlert,
  Menu,
  Mail,
  Lock,
  User,
  Briefcase,
  Shield,
  Hourglass,
  Route,
  Compass,
  Eye,
  EyeOff
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Vehicles from './components/Vehicles';
import Drivers from './components/Drivers';
import Trips from './components/Trips';
import Maintenance from './components/Maintenance';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import SafetyOverview from './components/SafetyOverview';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123'); // seed helper
  const [loginError, setLoginError] = useState('');

  const [loginTab, setLoginTab] = useState('signin'); // 'signin' | 'signup'
  
  // Sign Up fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('Fleet Manager');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  
  // Password visibility states
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  
  // OTP States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  
  // Timer & Toast states
  const [countdown, setCountdown] = useState(30);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Refs for 6-digit OTP fields
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const preseededRoles = [
    { name: 'Manager', email: 'manager@triplogix.com', password: 'password123', label: 'Fleet Manager' },
    { name: 'Driver', email: 'driver@triplogix.com', password: 'password123', label: 'Driver/Dispatcher' },
    { name: 'Safety', email: 'safety@triplogix.com', password: 'password123', label: 'Safety Officer' },
    { name: 'Analyst', email: 'finance@triplogix.com', password: 'password123', label: 'Financial Analyst' }
  ];
  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    let timer = null;
    if (showOtpScreen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showOtpScreen, countdown]);

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue[cleanValue.length - 1];
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const newDigits = [...otpDigits];
      if (otpDigits[index] === '') {
        if (index > 0) {
          newDigits[index - 1] = '';
          setOtpDigits(newDigits);
          otpRefs[index - 1].current.focus();
        }
      } else {
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
      e.preventDefault();
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    if (!email || !password) {
      setLoginError('Please enter both email address and password.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setActiveTab('dashboard');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleSendOtp = (e) => {
    if (e) e.preventDefault();
    setSignupError('');

    if (!signupName || !signupEmail || !signupPassword || !signupConfirmPassword) {
      setSignupError('All fields are required.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters.');
      return;
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(generatedOtp);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setShowOtpScreen(true);
    setCountdown(30);
    setToastMessage(`✉️ [Simulated Email] New OTP code: ${generatedOtp}`);
    setShowToast(true);
  };

  const handleVerifyAndRegister = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');

    const enteredOtp = otpDigits.join('');
    if (enteredOtp !== otpCode) {
      setOtpError('Invalid verification code. Please try again.');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          role: signupRole,
          password: signupPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setActiveTab('dashboard');
      setShowOtpScreen(false);
      setShowToast(false);
    } catch (err) {
      setOtpError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  const fetchWithAuth = async (url, options = {}) => {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      handleLogout();
    }
    return response;
  };

  if (!token) {
    return (
      <>
        <div className="login-wrapper">
        <div className="ambient-glow glow-1"></div>
        <div className="ambient-glow glow-2"></div>
        <div className="ambient-glow glow-3"></div>
        
        <div className="login-card fade-in">
          <div className="login-logo-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            <Route size={24} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>TripLogix</span>
          </div>

          {!showOtpScreen ? (
            <>
              {/* Tab Switchers */}
              <div className="login-tabs" style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '24px' }}>
                <button 
                  className={`login-tab-btn ${loginTab === 'signin' ? 'active' : ''}`}
                  onClick={() => { setLoginTab('signin'); setLoginError(''); }}
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: loginTab === 'signin' ? 'var(--bg-secondary)' : 'none', color: loginTab === 'signin' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)' }}
                >
                  Sign In
                </button>
                <button 
                  className={`login-tab-btn ${loginTab === 'signup' ? 'active' : ''}`}
                  onClick={() => { setLoginTab('signup'); setSignupError(''); }}
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: loginTab === 'signup' ? 'var(--bg-secondary)' : 'none', color: loginTab === 'signup' ? 'var(--text-primary)' : 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)' }}
                >
                  Sign Up
                </button>
              </div>

              {loginTab === 'signin' ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>Welcome back</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Sign in to manage your smart transport operations</p>
                  </div>

                  <form onSubmit={(e) => handleLogin(e)}>
                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="email" 
                          className="text-input" 
                          placeholder="name@triplogix.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          style={{ paddingLeft: '44px' }}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Password</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type={showSignInPassword ? "text" : "password"} 
                          className="text-input" 
                          placeholder="........"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingLeft: '44px', paddingRight: '44px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {loginError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '12px' }}>{loginError}</div>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '8px' }}>
                      Sign In &rarr;
                    </button>
                  </form>

                  <div className="role-switcher-box" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {preseededRoles.map(role => (
                        <button 
                          key={role.name}
                          type="button"
                          className={`role-chip ${email === role.email ? 'selected' : ''}`}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', height: '64px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)' }}
                          onClick={() => {
                            setEmail(role.email);
                            setPassword(role.password);
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{role.label}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{role.email}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>Create Account</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>Join TripLogix to manage your smart fleet operations</p>
                  </div>

                  <form onSubmit={handleSendOtp}>
                    <div className="form-group">
                      <label>Full Name</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="text" 
                          className="text-input" 
                          placeholder="John Doe"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          style={{ paddingLeft: '44px' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type="email" 
                          className="text-input" 
                          placeholder="name@triplogix.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          style={{ paddingLeft: '44px' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Account Role</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Briefcase size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <select 
                          className="select-input" 
                          value={signupRole} 
                          onChange={(e) => setSignupRole(e.target.value)}
                          style={{ paddingLeft: '44px', height: '44px' }}
                          required
                        >
                          <option value="Fleet Manager">Fleet Manager</option>
                          <option value="Driver">Driver / Coordinator</option>
                          <option value="Safety Officer">Safety Officer</option>
                          <option value="Financial Analyst">Financial Analyst</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Password</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type={showSignUpPassword ? "text" : "password"} 
                          className="text-input" 
                          placeholder="........"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          style={{ paddingLeft: '44px', paddingRight: '44px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {signupPassword && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.65rem' }}>
                          <span style={{ color: signupPassword.length >= 8 ? 'var(--success)' : signupPassword.length >= 6 ? 'var(--warning)' : 'var(--danger)' }}>
                            Password Strength: {signupPassword.length >= 8 ? 'Strong' : signupPassword.length >= 6 ? 'Medium' : 'Weak'}
                          </span>
                          <div style={{ width: '60px', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: signupPassword.length >= 8 ? '100%' : signupPassword.length >= 6 ? '60%' : '20%', height: '100%', backgroundColor: signupPassword.length >= 8 ? 'var(--success)' : signupPassword.length >= 6 ? 'var(--warning)' : 'var(--danger)' }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Confirm Password</label>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                          type={showSignUpConfirmPassword ? "text" : "password"} 
                          className="text-input" 
                          placeholder="........"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          style={{ paddingLeft: '44px', paddingRight: '44px' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpConfirmPassword(prev => !prev)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          {showSignUpConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {signupConfirmPassword && (
                        <div style={{ marginTop: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                          {signupPassword === signupConfirmPassword ? (
                            <span style={{ color: 'var(--success)' }}>✓ Passwords match</span>
                          ) : (
                            <span style={{ color: 'var(--danger)' }}>✗ Passwords do not match</span>
                          )}
                        </div>
                      )}
                    </div>

                    {signupError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '12px' }}>{signupError}</div>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '8px' }}>
                      Send OTP Verification &rarr;
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              {/* OTP Input Card */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>Verify Email</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Enter the OTP sent to your email</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '12px', lineHeight: '1.4' }}>
                  We have sent a verification code to <strong style={{ color: 'var(--text-primary)' }}>{signupEmail}</strong>. Enter the 6-digit code below:
                </p>
              </div>

              <form onSubmit={handleVerifyAndRegister}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={otpRefs[index]}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      style={{
                        width: '46px',
                        height: '46px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'var(--transition)'
                      }}
                      className="otp-digit-input"
                    />
                  ))}
                </div>

                {otpError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '12px' }}>{otpError}</div>}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                  Verify & Create Account ✓
                </button>
                
                {/* Didn't receive code and countdown */}
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Didn't receive the code?{' '}
                  {countdown > 0 ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Resend in {countdown}s</span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => {
                        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                        setOtpCode(newOtp);
                        setOtpDigits(['', '', '', '', '', '']);
                        setCountdown(30);
                        setToastMessage(`✉️ [Simulated Email] New OTP code: ${newOtp}`);
                        setShowToast(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
                    >
                      Resend code
                    </button>
                  )}
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: '6px' }}
                  onClick={() => setShowOtpScreen(false)}
                >
                  &larr; Back to Sign Up
                </button>
              </form>
            </>
          )}

        </div>
      </div>

      {/* Toast Notification Container */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '320px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Notification
            </span>
            <button 
              type="button"
              onClick={() => setShowToast(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
      </>
    );
  }

  // RBAC Navigation Filtering
  const isManager = user?.role === 'Fleet Manager';
  const isDriver = user?.role === 'Driver';
  const isSafety = user?.role === 'Safety Officer';
  const isAnalyst = user?.role === 'Financial Analyst';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, allowed: true },
    { id: 'vehicles', label: isManager ? 'Overseas Fleet Assets' : 'Vehicle Registry', icon: <Truck size={20} />, allowed: isManager || isDriver },
    { id: 'lifecycle', label: 'Vehicle Lifecycle', icon: <Hourglass size={20} />, allowed: isManager },
    { id: 'drivers', label: 'Drivers Registry', icon: <Users size={20} />, allowed: isDriver },
    { id: 'licenses', label: 'License Validity', icon: <AlertTriangle size={20} />, allowed: isSafety },
    { id: 'safety_audits', label: 'Driver Safety Scores', icon: <ShieldAlert size={20} />, allowed: isSafety },
    { id: 'trips', label: 'Trips', icon: <Map size={20} />, allowed: isDriver },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={20} />, allowed: isManager || isDriver },
    { id: 'fuel', label: 'Fuel Consumption', icon: <Fuel size={20} />, allowed: isAnalyst },
    { id: 'maint_costs', label: 'Maintenance Costs', icon: <Wrench size={20} />, allowed: isAnalyst },
    { id: 'op_expenses', label: 'Operational Expenses', icon: <DollarSign size={20} />, allowed: isAnalyst },
    { id: 'reports', label: 'Reports & Analytics', icon: <TrendingUp size={20} />, allowed: isManager || isAnalyst },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} fetchWithAuth={fetchWithAuth} setActiveTab={setActiveTab} />;
      case 'vehicles':
        return <Vehicles viewModeProp="registry" user={user} fetchWithAuth={fetchWithAuth} />;
      case 'lifecycle':
        return <Vehicles viewModeProp="lifecycle" user={user} fetchWithAuth={fetchWithAuth} />;
      case 'drivers':
        return <Drivers user={user} fetchWithAuth={fetchWithAuth} />;
      case 'licenses':
        return <SafetyOverview mode="licenses" user={user} fetchWithAuth={fetchWithAuth} setActiveTab={setActiveTab} />;
      case 'safety_audits':
        return <SafetyOverview mode="safety_audits" user={user} fetchWithAuth={fetchWithAuth} setActiveTab={setActiveTab} />;
      case 'trips':
        return <Trips user={user} fetchWithAuth={fetchWithAuth} />;
      case 'maintenance':
        return <Maintenance user={user} fetchWithAuth={fetchWithAuth} />;
      case 'fuel':
        return <Expenses mode="fuel" user={user} fetchWithAuth={fetchWithAuth} />;
      case 'maint_costs':
        return <Expenses mode="maint_costs" user={user} fetchWithAuth={fetchWithAuth} />;
      case 'op_expenses':
        return <Expenses mode="op_expenses" user={user} fetchWithAuth={fetchWithAuth} />;
      case 'reports':
        return <Reports user={user} fetchWithAuth={fetchWithAuth} />;
      default:
        return <Dashboard user={user} fetchWithAuth={fetchWithAuth} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="dashboard-container">
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      
      {/* Sidebar Nav */}
      <aside className="sidebar">
        <div className="logo-section" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Route size={24} style={{ color: 'var(--primary)' }} />
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>TripLogix</h1>
        </div>
        
        <nav>
          <ul className="nav-links">
            {menuItems.filter(item => item.allowed).map(item => (
              <li key={item.id}>
                <button 
                  className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="avatar">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={toggleTheme} style={{ flex: 1, padding: '8px' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-danger" onClick={handleLogout} style={{ flex: 1, padding: '8px' }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="main-content">
        <header className="header-row">
          <div className="header-title-group">
            <h2>{menuItems.find(m => m.id === activeTab)?.label}</h2>
          </div>
        </header>

        <section className="fade-in">
          {renderContent()}
        </section>
      </main>

      {/* Toast Notification Container */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          width: '320px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              System Notification
            </span>
            <button 
              onClick={() => setShowToast(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
