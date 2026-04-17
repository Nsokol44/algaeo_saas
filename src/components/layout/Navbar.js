'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import FarmSwitcher from './FarmSwitcher';

const navLinks = [
  { href: '/dashboard',  label: 'Projections' },
  { href: '/agtturbo',   label: 'AgTurbo' },
  { href: '/calculator', label: 'Cost Savings' },
  { href: '/soil',       label: 'Soil Score' },
  { href: '/schedule',   label: 'Reminders' },
  { href: '/archive',    label: 'Archive' },
  { href: '/yield',      label: 'Yield Upload' },
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

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const displayName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Farmer';

  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 58 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <Link href="/dashboard" style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--green)', textDecoration: 'none', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/algaeo-logo.png" alt="Algaeo" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            Algaeo.io
          </Link>
          <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid var(--border2)', paddingBottom: 1 }}>
            algaeo.com ↗
          </a>
        </div>

        {/* Nav links — desktop */}
        <ul style={{ display: 'flex', gap: 20, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
          {navLinks.map(link => (
            <li key={link.href}>
              <Link href={link.href} style={{
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
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

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <FarmSwitcher />
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', fontSize: 11, padding: '5px 10px', color: 'var(--text-dim)' }}>
            {displayName}
          </div>
          <button onClick={signOut} style={{
            fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace',
          }}>Out</button>
        </div>
      </div>
    </nav>
  );
}
