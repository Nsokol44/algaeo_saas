'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '../../components/layout/Navbar';
import FieldPlanner from '../../components/features/FieldPlanner';

export default function FieldPlannerPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth');
        return;
      }
      setSupabase(sb);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
      }}>
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: 11,
          color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 32px 80px' }}>
        <FieldPlanner supabase={supabase} />
      </div>
    </div>
  );
}
