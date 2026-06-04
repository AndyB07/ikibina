import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import ChiefDashboard from './components/ChiefDashboard';
import MemberDashboard from './components/MemberDashboard';
import { useLang } from './context/LangContext';

export default function App() {
  const { lang, toggleLang, t } = useLang();

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLanding, setShowLanding] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    document.body.classList.toggle('light', !darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDark = () => setDarkMode(d => !d);

  const handleLoginSuccess = (newToken, loggedInUser) => {
    setToken(newToken);
    setUser(loggedInUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setShowLanding(true);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => { if (!res.ok) handleLogout(); }).catch(() => {});
    }
  }, [token]);

  const floatingBtns = (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
      display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center'
    }}>
      {/* Language toggle */}
      <button
        onClick={toggleLang}
        title={lang === 'en' ? 'Hindura ururimi mu Kinyarwanda' : 'Switch to English'}
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontSize: '12px', fontWeight: 800,
          color: lang === 'en' ? '#10b981' : '#6366f1',
          transition: 'all 0.2s'
        }}
      >
        {lang === 'en' ? 'RW' : 'EN'}
      </button>

      {/* Dark/Light toggle */}
      <button
        onClick={toggleDark}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', transition: 'all 0.2s'
        }}
      >
        {darkMode
          ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        }
      </button>
    </div>
  );

  if (token && user) {
    return (
      <div style={{ minHeight: '100vh', width: '100%' }}>
        {floatingBtns}
        {user.role === 'admin' && <AdminDashboard token={token} user={user} onLogout={handleLogout} />}
        {user.role === 'chief' && <ChiefDashboard token={token} user={user} onLogout={handleLogout} />}
        {user.role === 'member' && <MemberDashboard token={token} user={user} onLogout={handleLogout} />}
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} darkMode={darkMode} toggleDark={toggleDark} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} darkMode={darkMode} toggleDark={toggleDark} onBack={() => setShowLanding(true)} />;
}
