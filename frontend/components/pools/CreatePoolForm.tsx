"use client";
import { useState, useEffect } from 'react';

interface Wholesaler {
  id: number;
  name: string;
}

export function CreatePoolForm({ groupId, onPoolCreated }: { groupId: number, onPoolCreated: () => void }) {
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState('');
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Wholesalers on load
  useEffect(() => {
    const fetchWholesalers = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const res = await fetch('https://chamacloud-api.onrender.com/api/pools/wholesalers/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWholesalers(data);
        }
      } catch (err) {
        console.error("Failed to load wholesalers", err);
      }
    };
    fetchWholesalers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('https://chamacloud-api.onrender.com/api/pools/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          group_id: groupId, 
          target_amount: targetAmount,
          wholesaler_id: selectedWholesaler 
        })
      });

      if (res.ok) {
        onPoolCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create pool');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-emerald-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-emerald-500"></div>
      
      <div className="flex items-center mb-6">
        <div className="h-10 w-10 flex-shrink-0 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mr-4 border border-emerald-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-emerald-950 tracking-tight">Start Funding Pool</h2>
      </div>

      <p className="text-emerald-700 text-sm font-medium mb-6">Select a supplier and set a target amount to pool funds together.</p>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 border border-red-100">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-1 block">Select Supplier</label>
          <select 
            className="w-full p-4 bg-gray-50 rounded-xl border border-emerald-200 text-emerald-950 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none appearance-none"
            value={selectedWholesaler}
            onChange={(e) => setSelectedWholesaler(e.target.value)}
            required
          >
            <option value="" disabled>-- Choose a Wholesaler --</option>
            {wholesalers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-1 block">Target Amount (KES)</label>
          <input 
            type="number" 
            placeholder="e.g. 15000" 
            className="w-full p-4 bg-gray-50 rounded-xl border border-emerald-200 text-emerald-950 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
            min="1"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !selectedWholesaler}
          className="w-full bg-lime-400 text-emerald-950 font-black text-lg py-4 rounded-xl shadow-lg hover:bg-lime-500 transition-all duration-300 disabled:opacity-50 mt-4"
        >
          {loading ? 'Starting Pool...' : 'Open Funding Pool'}
        </button>
      </form>
    </div>
  );
}