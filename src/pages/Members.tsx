import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { Users, Trash2, Shield, User, Loader2, AlertCircle, CheckCircle2, UserCheck, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/users');
      setMembers(res.data);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to load members' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setProcessingId(id);
    try {
      await api.delete(`/users/${id}`);
      setMembers(prev => prev.filter(m => m.id !== id));
      setFeedback({ type: 'success', message: 'Member removed successfully' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Removal failed' });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await api.put(`/users/${id}/approve`);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_approved: 1 } : m));
      setFeedback({ type: 'success', message: 'User approved' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Approval failed' });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleToggleRole = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    setProcessingId(id);
    try {
      await api.put(`/users/${id}/role`, { role: newRole });
      setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
      setFeedback({ type: 'success', message: `Role updated to ${newRole}` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Role update failed' });
    } finally {
      setProcessingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Team Members</h1>
        <p className="text-gray-500 font-medium">Manage access controls and staff permissions.</p>
      </header>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-xl shadow-sm border flex items-center gap-3 font-medium ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-200">
                <th className="px-6 py-4">User Info</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined On</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto w-6 h-6" /></td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No members found.</td></tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200 shadow-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{member.name}</span>
                          <span className="text-xs text-gray-500">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 italic">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          member.role === 'admin' ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {member.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                          {member.role}
                        </span>
                        {!member.is_approved && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                            Pending Approval
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {!member.is_approved && (
                          <button
                            disabled={processingId === member.id}
                            onClick={() => handleApprove(member.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 disabled:opacity-50"
                            title="Approve User"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        <button
                          disabled={processingId === member.id}
                          onClick={() => handleToggleRole(member.id, member.role)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 disabled:opacity-50"
                          title="Toggle Admin Role"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          disabled={processingId === member.id}
                          onClick={() => handleDelete(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 disabled:opacity-50"
                          title={member.is_approved ? "Delete Member" : "Reject Registration"}
                        >
                          {member.is_approved ? <Trash2 size={16} /> : <UserX size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default Members;
