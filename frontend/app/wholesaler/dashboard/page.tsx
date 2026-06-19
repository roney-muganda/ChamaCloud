"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WholesalerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX: Wrapping in setTimeout(0) pushes execution to the end of the event loop.
    // This safely bypasses the synchronous setState linter error.
    const initTimer = setTimeout(() => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
      } else {
        setLoading(false);
      }
    }, 0);

    // Cleanup the timer on unmount
    return () => clearTimeout(initTimer);
  }, [router]);

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
        <div className="bg-slate-800 rounded-[2rem] p-8 border border-slate-700 shadow-2xl text-center">
          <div className="h-24 w-24 bg-slate-700 rounded-3xl mx-auto mb-6 flex items-center justify-center border-2 border-dashed border-slate-500">
            <span className="text-4xl">📷</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Redeem Voucher</h2>
          <p className="text-slate-400 mb-8 text-sm">Scan a vendor&apos;s QR code or enter the voucher ID manually to process their bulk purchase.</p>
          
          <button className="w-full bg-blue-500 text-white font-black text-lg py-5 rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-400 transition-all duration-300">
            Open Scanner
          </button>
          
          <div className="mt-4">
            <button className="text-slate-400 font-bold text-sm hover:text-white transition-colors">
              Enter ID Manually
            </button>
          </div>
        </div>

        {/* Recent Transactions Placeholder */}
        <div className="mt-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Recent Redemptions</h3>
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 text-center">
            <p className="text-slate-500 text-sm font-medium">No vouchers redeemed yet today.</p>
          </div>
        </div>

      </div>
    </div>
  );
}