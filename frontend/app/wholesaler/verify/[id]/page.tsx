"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface VoucherDetails {
  code: string;
  amount: number;
  group_name: string;
  vendor_name: string;
  status: string;
  created_at: string;
}

export default function VerifyVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;

  const [voucher, setVoucher] = useState<VoucherDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemStatus, setRedeemStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // 1. Fetch the voucher details on load
  useEffect(() => {

    if (!voucherId) return;
    
    const fetchVoucher = async () => {
      try {
        const res = await fetch(`https://chamacloud-api.onrender.com/api/vouchers/${voucherId}/verify/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        const data = await res.json();

        if (res.ok) {
          setVoucher(data);
        } else {
          setError(data.error || 'Voucher not found or invalid.');
        }
      } catch {
        setError('Network error checking voucher.');
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [voucherId]);

  // 2. Handle Redemption
  const handleRedeem = async () => {
    setRedeemStatus('loading');
    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/vouchers/${voucherId}/redeem/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (res.ok) {
        setRedeemStatus('success');
      } else {
        alert(data.error || 'Failed to redeem voucher.');
        setRedeemStatus('idle');
      }
    } catch {
      alert('Network error during redemption.');
      setRedeemStatus('idle');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-bold text-white">Looking up voucher...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans flex items-center justify-center">
      <div className="max-w-md w-full">
        
        {/* Header Back Button */}
        <Link href="/wholesaler/dashboard" className="text-slate-400 font-bold text-sm hover:text-white mb-6 inline-block">
          ← Back to Scanner
        </Link>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Invalid Voucher</h2>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        ) : voucher ? (
          
          <div className="bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* The "Receipt" look */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            
            {redeemStatus === 'success' ? (
              <div className="text-center py-8 animate-in zoom-in duration-300">
                <div className="h-20 w-20 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✓</div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Complete!</h2>
                <p className="text-slate-500 font-medium">KES {voucher.amount} has been added to your payout balance.</p>
                <Link href="/wholesaler/dashboard">
                  <button className="mt-8 w-full bg-slate-100 text-slate-900 font-black py-4 rounded-xl hover:bg-slate-200">Scan Next</button>
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8 border-b border-dashed border-slate-300 pb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Voucher Value</p>
                  <h1 className="text-5xl font-black text-slate-900 tracking-tighter">KES {voucher.amount}</h1>
                  <span className={`inline-block mt-4 px-3 py-1 rounded-full text-xs font-bold ${voucher.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {voucher.status}
                  </span>
                </div>

                <div className="space-y-4 mb-8 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Chama Group</span>
                    <span className="font-bold text-slate-900">{voucher.group_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Prepared By</span>
                    <span className="font-bold text-slate-900">{voucher.vendor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Voucher Code</span>
                    <span className="font-mono font-bold text-slate-900">{voucher.code}</span>
                  </div>
                </div>

                <button 
                  onClick={handleRedeem}
                  disabled={redeemStatus === 'loading' || voucher.status !== 'ACTIVE'}
                  className="w-full bg-blue-500 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all duration-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  {redeemStatus === 'loading' ? 'Processing...' : voucher.status === 'ACTIVE' ? 'Redeem for Goods' : 'Cannot Redeem'}
                </button>
              </>
            )}
          </div>
          
        ) : null}

      </div>
    </div>
  );
}