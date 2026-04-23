'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import FarmSwitcher from './FarmSwitcher';

const navLinks = [
  { href: '/dashboard',  label: 'Projections',   emoji: '📊' },
  { href: '/agtturbo',   label: 'AgTurbo',        emoji: '🧪' },
  { href: '/calculator', label: 'Cost Savings',   emoji: '💰' },
  { href: '/soil',       label: 'Soil Score',     emoji: '🌱' },
  { href: '/schedule',   label: 'Reminders',      emoji: '📅' },
  { href: '/trials',     label: 'Field Trials',   emoji: '🔬' },
  { href: '/field-planner', label: 'Field Planner',  emoji: '🗺️' },
  { href: '/archive',    label: 'Archive',        emoji: '📁' },
  { href: '/yield',      label: 'Yield Upload',   emoji: '📈' },
];


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

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
      {/* ── Desktop navbar ── */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 56 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <Link href="/dashboard" style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/algaeo-logo.png" alt="Algaeo" style={{ width: 26, height: 26, borderRadius: '50%' }} />
              Algaeo.io
            </Link>
            <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid var(--border2)', paddingBottom: 1, display: 'none' }}
              className="desktop-only">
              algaeo.com ↗
            </a>
          </div>

          {/* Desktop nav links — hidden on small screens */}
          <ul style={{ display: 'flex', gap: 16, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'nowrap', overflow: 'hidden' }} className="desktop-nav">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link href={link.href} style={{
                  fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: pathname === link.href ? 'var(--green)' : 'var(--text-muted)',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  borderBottom: pathname === link.href ? '1px solid var(--green)' : '1px solid transparent',
                  paddingBottom: 2,
                }}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <FarmSwitcher />
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: 11, padding: '5px 10px', color: 'var(--text-dim)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <button onClick={signOut} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}>Out</button>
            {/* Hamburger — mobile only */}
            <button onClick={() => setMenuOpen(p => !p)} style={{ background: 'none', border: '1px solid var(--border2)', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px 8px', fontSize: 14, display: 'none' }} className="mobile-menu-btn">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '8px 0' }} className="mobile-menu">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px',
                fontSize: 13, color: pathname === link.href ? 'var(--green)' : 'var(--text-dim)',
                textDecoration: 'none',
                background: pathname === link.href ? 'var(--green-glow)' : 'transparent',
                borderLeft: pathname === link.href ? '3px solid var(--green)' : '3px solid transparent',
              }}>
                <span style={{ fontSize: 16 }}>{link.emoji}</span>
                {link.label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
            <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
              🌐 algaeo.com ↗
            </a>
          </div>
        )}
      </nav>

      {/* ── Mobile bottom tab bar ── */}
      <div className="mobile-tabs" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        padding: '6px 0 env(safe-area-inset-bottom)',
      }}>
        {navLinks.slice(0, 5).map(link => (
          <Link key={link.href} href={link.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            flex: 1, padding: '4px 2px', textDecoration: 'none',
            color: pathname === link.href ? 'var(--green)' : 'var(--text-muted)',
          }}>
            <span style={{ fontSize: 18 }}>{link.emoji}</span>
            <span style={{ fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {link.label.split(' ')[0]}
            </span>
          </Link>
        ))}
        <button onClick={() => setMenuOpen(p => !p)} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          flex: 1, padding: '4px 2px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)',
        }}>
          <span style={{ fontSize: 18 }}>☰</span>
          <span style={{ fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>More</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .mobile-tabs { display: flex !important; }
          .desktop-only { display: none !important; }
          body { padding-bottom: 64px; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
          .desktop-only { display: inline !important; }
        }
      `}</style>
    </>
  );
}
