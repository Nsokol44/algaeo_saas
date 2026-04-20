'use client';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border2)', padding: '48px 40px', textAlign: 'center' }}>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>Algaeo.io</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 36 }}>Account Created</div>

        <div style={{ fontSize: 40, marginBottom: 20 }}>📬</div>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
          Please verify your email
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: 32 }}>
          We've sent a confirmation link to your email address. Click the link to activate your account and access the Algaeo.io platform.
        </div>

        <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid var(--green-muted)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 32 }}>
          Can't find the email? Check your spam folder. The link expires in 24 hours.
        </div>

        <button className="btn-primary" onClick={() => router.push('/auth')} style={{ width: '100%' }}>
          Back to Sign In →
        </button>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <a href="https://algaeo.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
            algaeo.com →
          </a>
        </div>

      </div>
    </div>
  );
}
