import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { History as HistoryIcon, ArrowUpRight, ArrowDownRight, Loader2, Download, Filter, Search, FileText, FileSpreadsheet, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StockMovement, Product, Location } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const History = () => {
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    product_id: '',
    location_id: '',
    user_id: '',
    type: '',
    start_date: '',
    end_date: '',
    search: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [histRes, prodRes, locRes, userRes] = await Promise.all([
        api.get('/history'),
        api.get('/products'),
        api.get('/locations'),
        api.get('/users').catch(() => ({ data: [] })) // Might fail if not admin
      ]);
      setHistory(histRes.data);
      setProducts(prodRes.data);
      setLocations(locRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error('Failed to load history data', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.product_id) params.append('product_id', filters.product_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.type) params.append('type', filters.type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const res = await api.get(`/history?${params.toString()}`);
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to filter history', err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      product_id: '',
      location_id: '',
      user_id: '',
      type: '',
      start_date: '',
      end_date: '',
      search: ''
    });
    fetchInitialData();
  };

  const filteredHistory = history.filter(h => 
    (h.product_name || '(Deleted Product)').toLowerCase().includes(filters.search.toLowerCase()) ||
    (h.user_name || '(Deleted Agent)').toLowerCase().includes(filters.search.toLowerCase()) ||
    (h.location_name || '(Deleted Facility)').toLowerCase().includes(filters.search.toLowerCase())
  );

  const exportToExcel = () => {
    const data = filteredHistory.map(h => ({
      Timestamp: new Date(h.created_at).toLocaleString(),
      Product: h.product_name || '(Deleted Product)',
      Location: h.location_name || '(Deleted Facility)',
      Type: h.type === 'in' ? 'Deposit' : 'Withdrawal',
      Quantity: h.quantity,
      User: h.user_name || '(Deleted Agent)'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    XLSX.writeFile(wb, `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Inventory Audit Log Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = filteredHistory.map(h => [
      new Date(h.created_at).toLocaleString(),
      h.product_name || '(Deleted Product)',
      h.location_name || '(Deleted Facility)',
      h.type === 'in' ? 'Deposit' : 'Withdrawal',
      h.quantity,
      h.user_name || '(Deleted Agent)'
    ]);
    
    (doc as any).autoTable({
      head: [['Timestamp', 'Product', 'Location', 'Type', 'Qty', 'User']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillStyle: '#4f46e5' }
    });
    
    doc.save(`inventory_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Audit Log</h1>
          <p className="text-gray-500 font-medium italic">Immutable record of all inventory transactions and role actions.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 border ${
              showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} />
            Filters {Object.values(filters).filter(v => v !== '').length > 0 && `(${Object.values(filters).filter(v => v !== '').length})`}
          </button>
          
          <div className="relative group">
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
              <Download size={16} />
              Export
              <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20">
              <button 
                onClick={exportToExcel}
                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors rounded-t-xl"
              >
                <FileSpreadsheet size={16} />
                Export to Excel
              </button>
              <button 
                onClick={exportToPDF}
                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors rounded-b-xl"
              >
                <FileText size={16} />
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</label>
                <select 
                  value={filters.product_id}
                  onChange={(e) => setFilters({...filters, product_id: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="">All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</label>
                <select 
                  value={filters.location_id}
                  onChange={(e) => setFilters({...filters, location_id: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="">All Locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</label>
                <select 
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="in">Deposit (In)</option>
                  <option value="out">Withdrawal (Out)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                <input 
                  type="date" 
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date</label>
                <input 
                  type="date" 
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-1 lg:col-span-3 flex items-end gap-3 font-bold">
                <button 
                  onClick={applyFilters}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-all flex-1"
                >
                  Apply Filters
                </button>
                <button 
                  onClick={resetFilters}
                  className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg text-sm hover:bg-gray-200 transition-all flex-1 md:flex-none"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search in current results..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full pl-11 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest border-b border-gray-200 sticky top-0 z-10">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Quantity</th>
                <th className="px-6 py-4 text-right pr-8">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 italic">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto w-6 h-6" /></td></tr>
              ) : filteredHistory.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium whitespace-nowrap">No transactions recorded.</td></tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-gray-400 not-italic tabular-nums whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.type === 'in' 
                          ? <ArrowUpRight className="text-emerald-500" size={16} /> 
                          : <ArrowDownRight className="text-red-500" size={16} />}
                        <span className="text-sm font-bold text-gray-900 not-italic">{item.product_name || '(Deleted Product)'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-tight">
                      {item.location_name || '(Deleted Facility)'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-xs font-bold tabular-nums ${item.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {item.type === 'in' ? '+' : '-'}{item.quantity} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-8">
                      <div className="flex items-center justify-end gap-2 not-italic">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.user_name || '(Deleted Agent)'}</span>
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100">
                          {(item.user_name || 'D').charAt(0).toUpperCase()}
                        </div>
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

export default History;
