'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const [farms, setFarms] = useState([]);
  const [activeFarm, setActiveFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('farms').select('*').eq('user_id', user.id).order('created_at');
    setFarms(data || []);
    if (data?.length) setActiveFarm(data[0]);
    setLoading(false);
  };

  const addFarm = async (farmData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('farms').insert({ ...farmData, user_id: user.id }).select().single();
    if (!error) { setFarms(prev => [...prev, data]); setActiveFarm(data); }
    return { data, error };
  };

  const updateFarm = async (id, updates) => {
    const { data, error } = await supabase.from('farms').update(updates).eq('id', id).select().single();
    if (!error) {
      setFarms(prev => prev.map(f => f.id === id ? data : f));
      if (activeFarm?.id === id) setActiveFarm(data);
    }
    return { data, error };
  };

  const deleteFarm = async (id) => {
    await supabase.from('farms').delete().eq('id', id);
    const remaining = farms.filter(f => f.id !== id);
    setFarms(remaining);
    setActiveFarm(remaining[0] || null);
  };

  return (
    <FarmContext.Provider value={{ farms, activeFarm, setActiveFarm, addFarm, updateFarm, deleteFarm, loading, reload: loadFarms }}>
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => useContext(FarmContext);
