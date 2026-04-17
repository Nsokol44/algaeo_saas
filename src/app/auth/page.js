'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass] = useState('');

  const [suFname, setSuFname] = useState('');
  const [suLname, setSuLname] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suFarm, setSuFarm] = useState('');
  const [suState, setSuState] = useState('');
  const [suCrop, setSuCrop] = useState('Corn');
  const [suPass, setSuPass] = useState('');

  const [fpEmail, setFpEmail] = useState('');

  const supabase = createClient();

  const handleSignIn = async () => {
    if (!siEmail || !siPass) { setError('Please enter email and password.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPass });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  const handleSignUp = async () => {
    if (!suFname || !suEmail || !suPass) { setError('Please fill all required fields.'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({
      email: suEmail, password: suPass,
      options: { data: { first_name: suFname, last_name: suLname, farm_name: suFarm, state: suState, primary_crop: suCrop } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const handleForgotPassword = async () => {
    if (!fpEmail) { setError('Please enter your email address.'); return; }
    setLoading(true); setError(''); setSuccess('');
    const { error } = await supabase.auth.resetPasswordForEmail(fpEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess('Password reset email sent. Check your inbox.');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border2)', padding: '48px 40px' }}>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>Algaeo.io</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32 }}>Crop Intelligence Platform</div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {[['signin','Sign In'],['signup','Create Account'],['forgot','Forgot Password']].map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }} style={{
              padding: '8px 0', marginRight: 20, fontSize: 10, letterSpacing: '0.06em',
              textTransform: 'uppercase', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent',
              color: tab === t ? 'var(--green)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 12, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}
        {success && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid var(--green-muted)', color: 'var(--green)', fontSize: 12, padding: '10px 14px', marginBottom: 16 }}>{success}</div>}

        {/* Sign In */}
        {tab === 'signin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Email"><input className="input-base" type="email" placeholder="you@farm.com" value={siEmail} onChange={e => setSiEmail(e.target.value)} /></Field>
            <Field label="Password"><input className="input-base" type="password" placeholder="••••••••" value={siPass} onChange={e => setSiPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSignIn()} /></Field>
            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <span onClick={() => { setTab('forgot'); setFpEmail(siEmail); setError(''); }} style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', letterSpacing: '0.06em' }}>
                Forgot password?
              </span>
            </div>
            <button className="btn-primary" onClick={handleSignIn} disabled={loading}>{loading ? 'Signing in...' : 'Sign In →'}</button>
            <Divider />
            <GoogleBtn onClick={handleGoogle} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              No account? <span style={{ color: 'var(--green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTab('signup')}>Create one</span>
            </div>
          </div>
        )}

        {/* Sign Up */}
        {tab === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First Name *"><input className="input-base" type="text" placeholder="John" value={suFname} onChange={e => setSuFname(e.target.value)} /></Field>
              <Field label="Last Name"><input className="input-base" type="text" placeholder="Deere" value={suLname} onChange={e => setSuLname(e.target.value)} /></Field>
            </div>
            <Field label="Email *"><input className="input-base" type="email" placeholder="you@farm.com" value={suEmail} onChange={e => setSuEmail(e.target.value)} /></Field>
            <Field label="Farm Name"><input className="input-base" type="text" placeholder="Sunrise Acres" value={suFarm} onChange={e => setSuFarm(e.target.value)} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="State"><input className="input-base" type="text" placeholder="IA" value={suState} onChange={e => setSuState(e.target.value)} /></Field>
              <Field label="Primary Crop">
                <select className="input-base" value={suCrop} onChange={e => setSuCrop(e.target.value)} style={{ background: 'var(--bg)' }}>
                  {['Corn','Soybeans','Wheat','Tomatoes','Berries','Peanuts','Pasture','Miscanthus','Hemp','Cannabis'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Password *"><input className="input-base" type="password" placeholder="Min 8 characters" value={suPass} onChange={e => setSuPass(e.target.value)} /></Field>
            <button className="btn-primary" onClick={handleSignUp} disabled={loading}>{loading ? 'Creating account...' : 'Create Account →'}</button>
            <Divider />
            <GoogleBtn onClick={handleGoogle} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Already have an account? <span style={{ color: 'var(--green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTab('signin')}>Sign in</span>
            </div>
          </div>
        )}

        {/* Forgot Password */}
        {tab === 'forgot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Enter your email and we'll send you a link to reset your password.
            </div>
            <Field label="Email"><input className="input-base" type="email" placeholder="you@farm.com" value={fpEmail} onChange={e => setFpEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} /></Field>
            <button className="btn-primary" onClick={handleForgotPassword} disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link →'}</button>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Remembered it? <span style={{ color: 'var(--green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTab('signin')}>Back to sign in</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Learn more at algaeo.com →
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</div>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', position: 'relative', margin: '4px 0' }}>
      <span style={{ background: 'var(--surface)', padding: '0 8px', position: 'relative', zIndex: 1 }}>or</span>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)', zIndex: 0 }} />
    </div>
  );
}

function GoogleBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: 12, padding: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' }}>
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="#4ade80" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#22c55e" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#166534" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#4ade80" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  );
}