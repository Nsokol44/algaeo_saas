'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useEffect, useState, useRef } from 'react';
import FarmSwitcher from './FarmSwitcher';
import InviteModal from '@/components/ui/InviteModal';
import { useFarm } from '@/lib/FarmContext';

// "Soil Samples" lives under the "Field Trials" group — it's a way of logging
// data for/around a trial, not a separate top-level concept.
const navLinks = [
  { href: '/dashboard',  label: 'Projections',   emoji: '📊' },
  { href: '/agtturbo',   label: 'AgTurbo',        emoji: '🧪' },
  { href: '/calculator', label: 'Cost Savings',   emoji: '💰' },
  { href: '/soil',       label: 'Soil Score',     emoji: '🌱' },
  {
    href: '/trials', label: 'Field Trials', emoji: '🔬',
    children: [
      { href: '/trials',  label: 'Field Trials', emoji: '🔬' },
      { href: '/samples', label: 'Soil Samples',  emoji: '📍' },
    ],
  },
  { href: '/schedule',   label: 'Reminders',      emoji: '📅' },
  { href: '/archive',    label: 'Archive',        emoji: '📁' },
  { href: '/yield',      label: 'Yield Upload',   emoji: '📈' },
];

const mobileTabLinks = [
  { href: '/dashboard', label: 'Projections', emoji: '📊' },
  { href: '/agtturbo',  label: 'AgTurbo',      emoji: '🧪' },
  { href: '/trials',    label: 'Trials',       emoji: '🔬' },
  { href: '/samples',   label: 'Samples',      emoji: '📍' },
];

function isActive(pathname, link) {
  if (link.children) return link.children.some((c) => pathname === c.href);
  return pathname === link.href;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const supabase = createClient();
  const farmCtx = useFarm();
  const activeFarm = farmCtx?.activeFarm;
  const groupRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setMenuOpen(false); setOpenGroup(null); }, [pathname]);

  useEffect(() => {
    const onClick = (e) => { if (groupRef.current && !groupRef.current.contains(e.target)) setOpenGroup(null); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const displayName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Farmer';

  return (
    <>
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <Link href="/dashboard" style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/algaeo-logo.png" alt="Algaeo" style={{ width: 26, height: 26, borderRadius: '50%' }} />
              Algaeo.io
            </Link>
            <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid var(--border2)', paddingBottom: 1 }}>
              algaeo.com ↗
            </a>
          </div>

          <ul ref={groupRef} style={{ display: 'flex', gap: 16, listStyle: 'none', margin: 0, padding: 0, alignItems: 'center' }} className="desktop-nav">
            {navLinks.map((link) => {
              const active = isActive(pathname, link);
              if (!link.children) {
                return (
                  <li key={link.href}>
                    <Link href={link.href} style={{
                      fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase',
                      color: active ? 'var(--green)' : 'var(--text-muted)',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      borderBottom: active ? '1px solid var(--green)' : '1px solid transparent',
                      paddingBottom: 2,
                    }}>
                      {link.label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={link.href} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenGroup((g) => (g === link.href ? null : link.href))}
                    style={{
                      fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer',
                      color: active ? 'var(--green)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace',
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                      borderBottom: active ? '1px solid var(--green)' : '1px solid transparent', paddingBottom: 2,
                    }}
                  >
                    {link.label} <span style={{ fontSize: 8 }}>{openGroup === link.href ? '▲' : '▼'}</span>
                  </button>
                  {openGroup === link.href && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 10, background: 'var(--surface)', border: '1px solid var(--border2)', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 60 }}>
                      {link.children.map((c) => (
                        <Link key={c.href} href={c.href} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 11,
                          color: pathname === c.href ? 'var(--green)' : 'var(--text-dim)', textDecoration: 'none',
                          background: pathname === c.href ? 'var(--green-glow)' : 'transparent',
                        }}>
                          <span>{c.emoji}</span>{c.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {activeFarm && (
              <button onClick={() => setShowInvite(true)} title="Invite people to collect soil samples for this farm" style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase',
                background: 'var(--green-glow)', border: '1px solid var(--green-muted)', color: 'var(--green)',
                padding: '6px 12px', cursor: 'pointer', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
              }} className="invite-btn">
                👥 <span>Invite Collectors</span>
              </button>
            )}
            <FarmSwitcher />
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: 11, padding: '5px 10px', color: 'var(--text-dim)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="user-pill">
              {displayName}
            </div>
            <button onClick={signOut} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }} className="signout-btn">Out</button>
            <button onClick={() => setMenuOpen((p) => !p)} style={{ background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px 8px', fontSize: 14, display: 'none' }} className="mobile-menu-btn">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '8px 0' }} className="mobile-menu">
            {activeFarm && (
              <button onClick={() => { setShowInvite(true); setMenuOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', width: '100%', textAlign: 'left',
                fontSize: 13, color: 'var(--green)', background: 'var(--green-glow)', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
              }}>
                <span style={{ fontSize: 16 }}>👥</span>
                <span>Invite Collectors <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>Share a no-login link to collect soil samples</span></span>
              </button>
            )}
            {navLinks.map((link) => {
              if (!link.children) {
                return (
                  <Link key={link.href} href={link.href} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                    fontSize: 13, color: pathname === link.href ? 'var(--green)' : 'var(--text-dim)',
                    textDecoration: 'none',
                    background: pathname === link.href ? 'var(--green-glow)' : 'transparent',
                    borderLeft: pathname === link.href ? '3px solid var(--green)' : '3px solid transparent',
                  }}>
                    <span style={{ fontSize: 16 }}>{link.emoji}</span>
                    {link.label}
                  </Link>
                );
              }
              return (
                <div key={link.href}>
                  <div style={{ padding: '10px 20px 4px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{link.emoji} {link.label}</div>
                  {link.children.map((c) => (
                    <Link key={c.href} href={c.href} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px 10px 36px',
                      fontSize: 13, color: pathname === c.href ? 'var(--green)' : 'var(--text-dim)',
                      textDecoration: 'none',
                      background: pathname === c.href ? 'var(--green-glow)' : 'transparent',
                      borderLeft: pathname === c.href ? '3px solid var(--green)' : '3px solid transparent',
                    }}>
                      <span style={{ fontSize: 14 }}>{c.emoji}</span>
                      {c.label}
                    </Link>
                  ))}
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
            <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', width: '100%', textAlign: 'left', fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>
              <span style={{ fontSize: 16 }}>🚪</span> Sign Out
            </button>
            <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              🌐 algaeo.com ↗
            </a>
          </div>
        )}
      </nav>

      <div className="mobile-tabs" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '6px 0 env(safe-area-inset-bottom)' }}>
        {mobileTabLinks.map((link) => (
          <Link key={link.href} href={link.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            flex: 1, padding: '4px 2px', textDecoration: 'none',
            color: pathname === link.href ? 'var(--green)' : 'var(--text-muted)',
          }}>
            <span style={{ fontSize: 18 }}>{link.emoji}</span>
            <span style={{ fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{link.label}</span>
          </Link>
        ))}
        <button onClick={() => setMenuOpen((p) => !p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, padding: '4px 2px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 18 }}>☰</span>
          <span style={{ fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>More</span>
        </button>
      </div>

      {showInvite && activeFarm && <InviteModal farm={activeFarm} onClose={() => setShowInvite(false)} />}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .mobile-tabs { display: flex !important; }
          .invite-btn span, .user-pill, .signout-btn { display: none; }
          .invite-btn { padding: 6px 8px !important; }
          body { padding-bottom: 64px; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
}
