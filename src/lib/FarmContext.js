'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [farms, setFarms] = useState([]);
  const [activeFarm, setActiveFarm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Wait for session before loading farms
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadFarms(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Re-load on auth state change (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadFarms(session.user.id);
      } else {
        setFarms([]);
        setActiveFarm(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFarms = async (userId) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    setFarms(data || []);
    if (data?.length) {
      setActiveFarm(prev => prev ? (data.find(f => f.id === prev.id) || data[0]) : data[0]);
    }
    setLoading(false);
  };

  const addFarm = async (farmData) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('farms')
      .insert({ ...farmData, user_id: user.id })
      .select()
      .single();
    if (!error && data) {
      setFarms(prev => [...prev, data]);
      setActiveFarm(data);
    }
    return { data, error };
  };

  const updateFarm = async (id, updates) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('farms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setFarms(prev => prev.map(f => f.id === id ? data : f));
      if (activeFarm?.id === id) setActiveFarm(data);
    }
    return { data, error };
  };

  const deleteFarm = async (id) => {
    const supabase = createClient();
    await supabase.from('farms').delete().eq('id', id);
    const remaining = farms.filter(f => f.id !== id);
    setFarms(remaining);
    setActiveFarm(remaining[0] || null);
  };

  return (
    <FarmContext.Provider value={{ farms, activeFarm, setActiveFarm, addFarm, updateFarm, deleteFarm, loading, reload: () => loadFarms() }}>
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => useContext(FarmContext);
