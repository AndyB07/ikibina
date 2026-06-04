import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Login({ onLoginSuccess, darkMode, toggleDark, onBack }) {
  const { lang, toggleLang, t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError(t('emailAddress') + ' & ' + t('password')); return; }
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center animate-fade-in" style={{ minHeight: '100vh', padding: '20px', position: 'relative' }}>

      {/* Top-left: Back button */}
      <button onClick={onBack} style={{
        position: 'fixed', top: '20px', left: '20px',
        background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
        borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
        color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: 600, zIndex: 50
      }}>
        <ArrowLeft size={15} /> {t('back')}
      </button>

      {/* Top-right: Language + Dark/Light */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', display: 'flex', gap: '8px', zIndex: 50 }}>
        <button onClick={toggleLang} title={lang === 'en' ? 'Hindura mu Kinyarwanda' : 'Switch to English'} style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
          borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '5px',
          fontSize: '13px', fontWeight: 800,
          color: lang === 'en' ? '#10b981' : '#6366f1'
        }}>
          🌐 {lang === 'en' ? 'RW' : 'EN'}
        </button>
        <button onClick={toggleDark} style={{
          background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
          borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', fontWeight: 600
        }}>
          {darkMode ? <Sun size={15} color="#f59e0b" /> : <Moon size={15} color="#6366f1" />}
          {darkMode ? t('light') : t('dark')}
        </button>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '40px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10px', left: '-10px', right: '-10px', bottom: '-10px', background: 'radial-gradient(circle at center, rgba(99,102,241,0.1) 0%, transparent 70%)', zIndex: -1, pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>IKIBINA</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>{t('systemSubtitle')}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '10px', fontSize: 'var(--font-size-sm)', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('emailAddress')}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" className="input-field" placeholder={t('emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '44px', width: '100%' }} disabled={loading} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">{t('password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type={showPassword ? 'text' : 'password'} className="input-field" placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '44px', paddingRight: '44px', width: '100%' }} disabled={loading} />
              <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: 'var(--font-size-base)' }} disabled={loading}>
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
