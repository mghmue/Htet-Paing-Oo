import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { MapPin, Plus, Trash2, Edit3, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Location } from '../types';

const Locations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const res = await api.get('/locations');
    setLocations(res.data);
    setLoading(false);
  };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setNewLocationName(loc.name);
    setIsModalOpen(true);
  };

  const closePortal = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setNewLocationName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation.id}`, { name: newLocationName });
        setFeedback({ type: 'success', message: 'Location updated.' });
      } else {
        await api.post('/locations', { name: newLocationName });
        setFeedback({ type: 'success', message: 'Location added.' });
      }
      await fetchLocations();
      closePortal();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Operation failed' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this location? This might affect stock movement history display.')) return;
    try {
      await api.delete(`/locations/${id}`);
      setLocations(locations.filter(l => l.id !== id));
      setFeedback({ type: 'success', message: 'Location removed.' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to delete' });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Active Facilities</h1>
          <p className="text-gray-500 font-medium italic">Operational hubs for stock distribution.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Define Facility
          </button>
        )}
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

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((loc, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={loc.id} 
              className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm group hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="bg-indigo-50 w-12 h-12 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100/50">
                <MapPin size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{loc.name}</h3>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Online Facility</p>
              </div>
              
              {isAdmin && (
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(loc)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(loc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {locations.length === 0 && (
            <div className="col-span-full py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-medium italic">
              No facilities mapped out yet.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200"
            >
              <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">{editingLocation ? 'Modify Facility' : 'New Hub'}</h2>
                <button onClick={closePortal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Facility Name</label>
                  <input 
                    required
                    autoFocus
                    type="text" 
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="e.g., Central Distribution"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all"
                  />
                </div>
                <button 
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingLocation ? 'Update Facility' : 'Confirm Setup')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Locations;
