"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WholesalerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [voucherId, setVoucherId] = useState('');

  useEffect(() => {
    const initTimer = setTimeout(() => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
      } else {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(initTimer);
  }, [router]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (voucherId.trim()) {
      router.push(`/wholesaler/verify/${voucherId.trim()}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-800">Loading Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10 mt-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Supplier Portal</h1>
            <p className="text-slate-400 font-medium mt-1">Ready to fulfill orders.</p>
          </div>
          <div className="h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center text-2xl shadow-inner border border-blue-500/30">🏪</div>
        </div>

        {/* Action Card: Scan Voucher */}
        <div className="bg-slate-800 rounded-[2rem] p-8 border border-slate-700 shadow-2xl text-center transition-all duration-300">
          <div className="h-24 w-24 bg-slate-700 rounded-3xl mx-auto mb-6 flex items-center justify-center border-2 border-dashed border-slate-500">
            <span className="text-4xl">📷</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Redeem Voucher</h2>
          <p className="text-slate-400 mb-8 text-sm">Scan a vendor&apos;s QR code or enter the voucher ID manually to process their bulk purchase.</p>
          
          {!showManual ? (
            <>
              <button 
                onClick={() => alert('Camera scanning requires a production HTTPS environment. Use Manual Entry for now!')}
                className="w-full bg-blue-500 text-white font-black text-lg py-5 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-all duration-300 mb-4"
              >
                Open Scanner
              </button>
              <button 
                onClick={() => setShowManual(true)}
                className="text-slate-400 font-bold text-sm hover:text-white transition-colors"
              >
                Enter ID Manually
              </button>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <input 
                type="text" 
                placeholder="e.g. VOUCHER-1234" 
                value={voucherId}
                onChange={(e) => setVoucherId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white text-center font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase"
                required
              />
              <button 
                type="submit"
                className="w-full bg-lime-400 text-slate-900 font-black text-lg py-4 rounded-xl shadow-lg hover:bg-lime-300 transition-all duration-300"
              >
                Verify Code
              </button>
              <button 
                type="button"
                onClick={() => setShowManual(false)}
                className="text-slate-400 font-bold text-sm hover:text-white transition-colors block w-full"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}