import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';

const DataContext = createContext();

const TABLES = [
  'customers', 'vehicles', 'suppliers', 'sale_products', 'purchase_products',
  'work_orders', 'sales', 'purchases', 'collections', 'payments', 'checks', 'employees',
  'treasury_accounts', 'cash_sessions', 'cash_movements',
];

export const DataProvider = ({ children }) => {
  const { session, organization, loading: authLoading, refreshData: refreshAuthData } = useAuth();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const orgId = organization?.id;

  const fetchData = useCallback(async (fetchOrgId) => {
    if (!fetchOrgId) {
        setLoading(false);
        setData({});
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchPromises = TABLES.map(async (table) => {
        const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .eq('organization_id', fetchOrgId);
        
        if (tableError) {
            console.error(`Error fetching ${table}:`, tableError);
            throw new Error(`Failed to fetch ${table}`);
        };
        return { table, data: tableData };
      });

      const results = await Promise.all(fetchPromises);
      const newData = results.reduce((acc, { table, data }) => {
        acc[table] = data;
        return acc;
      }, {});
      
      setData(newData);
    } catch (e) {
      console.error("Error fetching data:", e);
      setError(e.message);
      setData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (orgId) {
      fetchData(orgId);
    } else {
      setLoading(false);
      setData({});
    }
  }, [orgId, authLoading, fetchData]);
  
  const refreshData = useCallback(async () => {
    if (orgId) {
      await fetchData(orgId);
    }
  }, [orgId, fetchData]);

  const addData = useCallback(async (table, newData) => {
    if (!orgId) throw new Error("No organization context");
    const payload = Array.isArray(newData) 
        ? newData.map(item => ({ ...item, organization_id: orgId }))
        : { ...newData, organization_id: orgId };
    
    const { data: result, error } = await supabase.from(table).insert(payload).select();
    if (error) throw error;

    setData(prevData => {
        const newItems = Array.isArray(result) ? result : [result];
        return {
            ...prevData,
            [table]: [...(prevData[table] || []), ...newItems]
        };
    });
    
    return Array.isArray(result) && result.length === 1 ? result[0] : result;
  }, [orgId]);

  const updateData = useCallback(async (table, id, updatedData) => {
    const { data: result, error } = await supabase.from(table).update(updatedData).eq('id', id).select().single();
    if (error) throw error;
    
    setData(prevData => ({
        ...prevData,
        [table]: (prevData[table] || []).map(item => item.id === id ? result : item)
    }));

    return result;
  }, []);
  
  const batchUpdate = useCallback(async (table, updates) => {
    const { data: result, error } = await supabase.from(table).upsert(updates).select();
    if (error) throw error;

    setData(prevData => {
        const updatedIds = new Set(result.map(r => r.id));
        const oldData = (prevData[table] || []).filter(item => !updatedIds.has(item.id));
        return {
            ...prevData,
            [table]: [...oldData, ...result]
        };
    });
    return result;
  }, []);


  const updateOrganization = useCallback(async (updatedData) => {
    if (!orgId) throw new Error("No organization context");
    const { data: result, error } = await supabase
      .from('organizations')
      .update(updatedData)
      .eq('id', orgId)
      .select()
      .single();
    if (error) throw error;
    
    await refreshAuthData();
    
    return result;
  }, [orgId, refreshAuthData]);

  const deleteData = useCallback(async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    
    setData(prevData => ({
        ...prevData,
        [table]: (prevData[table] || []).filter(item => item.id !== id)
    }));
  }, []);
  
  const value = useMemo(() => ({
    data,
    loading,
    error,
    fetchData: refreshData,
    addData,
    updateData,
    batchUpdate,
    deleteData,
    updateOrganization,
    organization,
  }), [data, loading, error, refreshData, addData, updateData, batchUpdate, deleteData, updateOrganization, organization]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};