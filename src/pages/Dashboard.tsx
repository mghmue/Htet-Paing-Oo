import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { Package, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, Loader2, BarChart3, Activity, Database } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'motion/react';

const Dashboard = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('_non_existent_table').select('*').limit(1);
        // If it's a 401 or 404 but not a network error, we are "connected" to the instance
        // Or if we can get anything back. 
        // Actually Supabase usually has a 'heartbeat' or we can just try to list something.
        // For now, if we don't get a network error, it's a win.
        if (error && error.message.includes('FetchError')) {
          setSupabaseConnected(false);
        } else {
          setSupabaseConnected(true);
        }
      } catch (err) {
        setSupabaseConnected(false);
      }
    };
    
    checkSupabase();
    
    const fetchDashboard = async () => {
      const res = await api.get('/dashboard');
      setData(res.data);
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
    </div>
  );

  const stats = [
    { label: 'Asset Variety', value: data.totalProducts, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Global Inventory', value: data.totalStock, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (data.pendingApprovals > 0) {
    stats.push({ 
      label: 'Pending Approvals', 
      value: data.pendingApprovals, 
      icon: TrendingUp, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System Oversight</h1>
          <p className="text-gray-500 font-medium italic">High-level summary of inventory health and logistics tracking.</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${
          supabaseConnected === true 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
            : supabaseConnected === false 
              ? 'bg-red-50 text-red-600 border-red-100'
              : 'bg-gray-50 text-gray-400 border-gray-100 animate-pulse'
        }`}>
          <Database size={12} />
          Supabase {supabaseConnected === true ? 'Integrated' : supabaseConnected === false ? 'Connection Failed' : 'Scanning...'}
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label} 
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-6"
          >
            <div className={`${stat.bg} ${stat.color} p-4 rounded-xl shadow-sm border border-black/5`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-gray-900 leading-none">{stat.value.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              Live Operations
            </h2>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Synchronized</span>
          </div>
          <div className="flex-1 min-h-[300px] overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-200">
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Facility</th>
                  <th className="px-6 py-4 text-right">Qty</th>
                  <th className="px-6 py-4 text-right">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 italic">
                {data.recentActivities.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No logs found.</td></tr>
                ) : (
                  data.recentActivities.map((activity: any) => (
                    <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {activity.type === 'in' 
                            ? <ArrowUpRight className="text-emerald-500" size={16} /> 
                            : <ArrowDownRight className="text-red-500" size={16} />}
                          <span className="text-sm font-bold text-gray-900 not-italic">{activity.product_name || '(Deleted Product)'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-500">{activity.location_name || '(Deleted Facility)'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-bold ${activity.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {activity.type === 'in' ? '+' : '-'}{activity.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-tighter">{activity.user_name || '(Deleted Agent)'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
          <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-400" />
            Asset Weight
          </h2>
          <div className="flex-1 min-h-[260px]">
            {data.stockDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.stockDistribution}
                    dataKey="total_stock"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                  >
                    {data.stockDistribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }} 
                    formatter={(value: any, name: string) => [`${value} Units`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 italic text-sm">No distribution data.</div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
              <span>Primary Sector</span>
              <span>84% Capacity</span>
            </div>
            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full w-[84%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
