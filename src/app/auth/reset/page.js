'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) setReady(true);
      }
    });

    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
        else setError('Invalid or expired reset link. Please request a new one.');
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true);
        else setError('Invalid or expired reset link. Please request a new one.');
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password) { setError('Please enter a new password.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push('/auth'), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border2)', padding: '48px 40px' }}>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>Algaeo.io</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32 }}>
          {success ? 'Password Updated' : 'Set New Password'}
        </div>

        {success ? (
          <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid var(--green-muted)', color: 'var(--green)', fontSize: 12, padding: '14px 16px', lineHeight: 1.7 }}>
            ✓ Password updated. Redirecting to sign in...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!ready && !error && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifying reset link...</div>
            )}
            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 12, padding: '10px 14px', lineHeight: 1.6 }}>
                {error}
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: 'var(--green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => router.push('/auth')}>
                    Back to sign in →
                  </span>
                </div>
              </div>
            )}
            {ready && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>New Password</div>
                  <input className="input-base" type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Confirm Password</div>
                  <input className="input-base" type="password" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} />
                </div>
                <button className="btn-primary" onClick={handleReset} disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? 'Updating...' : 'Set New Password →'}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>algaeo.com →</a>
        </div>
      </div>
    </div>
  );
}
