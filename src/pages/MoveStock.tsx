import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { ArrowRightLeft, Package, MapPin, Loader2, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Location } from '../types';

const MoveStock = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'in' | 'out'>('out');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/locations')
    ]).then(([resP, resL]) => {
      setProducts(resP.data);
      setLocations(resL.data);
      setLoading(false);
    });
  }, []);

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedLocation || quantity <= 0) {
      setFeedback({ type: 'error', message: 'Incomplete parameters.' });
      return;
    }
    
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/stock/move', {
        product_id: parseInt(selectedProduct),
        location_id: parseInt(selectedLocation),
        quantity,
        type
      });
      setFeedback({ type: 'success', message: `Manifest entry confirmed: ${type.toUpperCase()}` });
      const res = await api.get('/products');
      setProducts(res.data);
      setQuantity(1);
      setSelectedProduct('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Movement rejected.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
    </div>
  );

  const product = products.find(p => p.id === parseInt(selectedProduct));

  return (
    <div className="max-w-xl mx-auto space-y-10">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Manifest Entry</h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Material logistics & stock flow</p>
      </header>

      <section className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="h-1 bg-gray-100 w-full relative">
          <AnimatePresence>
            {submitting && (
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: '100%' }} 
                className="absolute inset-0 bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
              />
            )}
          </AnimatePresence>
        </div>

        <form onSubmit={handleMove} className="p-8 space-y-8">
          <AnimatePresence>
            {feedback && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-bold uppercase tracking-wider ${
                  feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {feedback.message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex p-1 bg-gray-50 border border-gray-200 rounded-xl">
            <button
              type="button"
              onClick={() => setType('out')}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                type === 'out' ? 'bg-white text-red-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Withdrawal
            </button>
            <button
              type="button"
              onClick={() => setType('in')}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                type === 'in' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Deposit
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Package size={12} /> Target Asset
              </label>
              <select
                required
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.total_stock})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> facility point
              </label>
              <select
                required
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-gray-900 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select location...</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">unit count</label>
              <input
                required
                type="number"
                min="1"
                max={type === 'out' ? product?.total_stock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-2xl text-gray-900 transition-all"
              />
              {type === 'out' && product && (
                <div className="flex items-center gap-2 px-1">
                  <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (quantity / product.total_stock) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{Math.round((quantity / product.total_stock) * 100)}% of stock</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-6 ${
              type === 'in' 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' 
                : 'bg-gray-900 hover:bg-black text-white shadow-gray-200'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Register Transaction
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>
      </section>

      <footer className="text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
          Operational safety active. All movements are non-reversible without administrative override.
        </p>
      </footer>
    </div>
  );
};

export default MoveStock;
