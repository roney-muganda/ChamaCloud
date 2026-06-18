import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface VoucherDetails {
  status: string;
  voucher_id: string;
  code: string;
  vendor_phone: string;
  amount_value: number;
  pool_group: string;
  expires_at: string;
}

export default function WholesalerVerifyPage() {
  const router = useRouter();
  const { key } = router.query; 
  const [loading, setLoading] = useState(true);
  const [voucher, setVoucher] = useState<VoucherDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !key) return;

    // Fetch validation status from your Render API
    fetch(`https://chamacloud-api.onrender.com/api/payments/vouchers/${key}/`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.reason || "Voucher is invalid.");
        return data;
      })
      .then((data) => {
        setVoucher(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [key, router.isReady]);

  const handleRedeemVoucher = async () => {
    if (!key) return;
    setClaiming(true);

    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/payments/vouchers/${key}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message);
        setVoucher(null); // Clear voucher data so it can't be clicked again
      } else {
        setError(data.error || "Failed to redeem voucher.");
      }
    } catch (err) {
      setError("Network connectivity loss to payment server.");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium animate-pulse">Verifying securely with backend servers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-2xl font-extrabold text-gray-900">Wholesaler Clearance</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm mb-4">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-4 text-center font-semibold flex flex-col gap-2">
              <span className="text-2xl">🎉</span>
              <span>{successMsg}</span>
            </div>
          )}

          {voucher && (
            <div className="space-y-6">
              <div className="text-center border-b border-gray-100 pb-4">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Authorized Claim Value</p>
                <p className="text-4xl font-black text-emerald-600">KES {voucher.amount_value}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-gray-400 text-xs">Vendor Account</p>
                  <p className="font-semibold text-gray-700">{voucher.vendor_phone}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Sourcing Group</p>
                  <p className="font-semibold text-gray-700">{voucher.pool_group}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Reference Code</p>
                  <p className="font-mono font-bold text-gray-700">{voucher.code}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Expires At</p>
                  <p className="font-semibold text-rose-500">
                    {new Date(voucher.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button
                onClick={handleRedeemVoucher}
                disabled={claiming}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition duration-150 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {claiming ? "Processing Clearance..." : "Confirm Goods Issuance & Claim Cash"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}