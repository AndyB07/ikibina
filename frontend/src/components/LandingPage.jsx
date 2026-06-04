import React from 'react';
import { Shield, Users, TrendingUp, Smartphone, Award, FileText, Sun, Moon, ArrowRight, CheckCircle } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function LandingPage({ onGetStarted, darkMode, toggleDark }) {
  const { lang, toggleLang, t } = useLang();

  const features = [
    { icon: Users, titleKey: 'feat1Title', descKey: 'feat1Desc' },
    { icon: TrendingUp, titleKey: 'feat2Title', descKey: 'feat2Desc' },
    { icon: Smartphone, titleKey: 'feat3Title', descKey: 'feat3Desc' },
    { icon: Shield, titleKey: 'feat4Title', descKey: 'feat4Desc' },
    { icon: Award, titleKey: 'feat5Title', descKey: 'feat5Desc' },
    { icon: FileText, titleKey: 'feat6Title', descKey: 'feat6Desc' },
  ];

  const roles = [
    { roleKey: 'roleAdmin', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', points: ['adminP1','adminP2','adminP3','adminP4'] },
    { roleKey: 'roleChief', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', points: ['chiefP1','chiefP2','chiefP3','chiefP4'] },
    { roleKey: 'roleMember', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', points: ['memberP1','memberP2','memberP3','memberP4'] },
  ];

  return (
    <div style={{ minHeight: '100vh', width: '100%', fontFamily: 'Outfit, sans-serif' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '0 40px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '14px', color: '#fff'
          }}>IK</div>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>IKIBINA</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            title={lang === 'en' ? 'Hindura mu Kinyarwanda' : 'Switch to English'}
            style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
              borderRadius: '10px', padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 800,
              color: lang === 'en' ? '#10b981' : '#6366f1',
              transition: 'all 0.2s'
            }}
          >
            🌐 {lang === 'en' ? 'RW' : 'EN'}
          </button>

          {/* Dark/Light toggle */}
          <button
            onClick={toggleDark}
            style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)',
              borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            {darkMode ? <Sun size={16} color="#f59e0b" /> : <Moon size={16} color="#6366f1" />}
            {darkMode ? t('light') : t('dark')}
          </button>

          <button onClick={onGetStarted} className="btn btn-primary" style={{ padding: '9px 22px' }}>
            {t('signIn')} <ArrowRight size={15} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '100px 24px 60px',
        background: darkMode
          ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.25) 0%, transparent 70%)'
          : 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 70%)'
      }}>
        <div style={{ maxWidth: '780px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '9999px', padding: '6px 16px', marginBottom: '32px',
            fontSize: '13px', fontWeight: 600, color: '#818cf8'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            {t('landingBadge')}
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', color: 'var(--text-primary)' }}>
            {t('landingHeroTitle1')}{' '}
            <span style={{ background: 'linear-gradient(135deg, #a5b4fc, #6366f1, #d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {t('landingHeroHighlight')}
            </span>
            {' '}{t('landingHeroTitle2')}
          </h1>

          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 40px' }}>
            {t('landingHeroDesc')}
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={onGetStarted} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem', borderRadius: '14px' }}>
              {t('getStarted')} <ArrowRight size={18} />
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', justifyContent: 'center', marginTop: '64px',
            background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-glass)', borderRadius: '16px',
            overflow: 'hidden', flexWrap: 'wrap'
          }}>
            {[
              { value: '100%', label: t('stat1') },
              { value: 'MTN', label: t('stat2') },
              { value: 'Airtel', label: t('stat3') },
              { value: '3', label: t('stat4') },
            ].map((s, i, arr) => (
              <div key={i} style={{
                flex: '1 1 120px', padding: '20px 24px', textAlign: 'center',
                borderRight: i < arr.length - 1 ? '1px solid var(--border-glass)' : 'none'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>{t('everythingYouNeed')}</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--text-primary)' }}>{t('builtFor')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '14px', fontSize: '1rem', maxWidth: '500px', margin: '14px auto 0' }}>{t('builtForDesc')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {features.map((f, i) => (
            <div key={i} className="glass-panel glass-panel-hover" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <f.icon size={22} color="#818cf8" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{t(f.titleKey)}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 40px', background: 'var(--bg-glass)', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>{t('howItWorks')}</p>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '56px' }}>{t('threeRoles')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {roles.map((r, i) => (
              <div key={i} className="glass-panel" style={{ padding: '28px', textAlign: 'left', border: `1px solid ${r.border}`, background: r.bg }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: r.color, marginBottom: '16px' }}>{t(r.roleKey)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {r.points.map((p, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle size={15} color={r.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t(p)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>{t('readyToDigitize')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '36px', lineHeight: 1.7 }}>{t('readyDesc')}</p>
          <button onClick={onGetStarted} className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '1.05rem', borderRadius: '14px' }}>
            {t('getStarted')} <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border-glass)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px', color: '#fff' }}>IK</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>IKIBINA</span>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>© {new Date().getFullYear()} {t('footerText')}</span>
      </footer>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }`}</style>
    </div>
  );
}
