import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function WholesalerDashboard() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  // 1. Check Approval Status on Load
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Replace with your actual user profile endpoint
        const res = await fetch('https://chamacloud-api.onrender.com/api/accounts/profile/', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIsApproved(data.is_approved_wholesaler);
          if (data.is_approved_wholesaler) {
            setScannerActive(true); // Only turn on the camera if approved!
          }
        }
      } catch (err) {
        console.error("Failed to fetch user status");
      }
    };
    checkStatus();
  }, []);

  // 2. Initialize Camera (Only if Approved)
  useEffect(() => {
    if (typeof window !== 'undefined' && scannerActive && isApproved) {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear();
            setScannerActive(false);
            let key = decodedText;
            if (decodedText.includes('/wholesaler/verify/')) {
               key = decodedText.split('/wholesaler/verify/')[1];
            }
            router.push(`/wholesaler/verify/${key}`);
          },
          (errorMessage) => {} // Ignore continuous scanning errors
        );

        return () => {
          scanner.clear().catch(e => console.error(e));
        };
      });
    }
  }, [router, scannerActive, isApproved]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      setScannerActive(false);
      router.push(`/wholesaler/verify/${manualCode.trim().toUpperCase()}`);
    }
  };

  // If we are still checking their status, show a loader
  if (isApproved === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-medium text-gray-500">Loading terminal...</div>;
  }

  // If they applied but the admin hasn't checked the box yet
  if (isApproved === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
          <span className="text-5xl block mb-4">⏳</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Under Review</h2>
          <p className="text-gray-600 mb-6">
            Your wholesaler account is currently pending administrative approval. You will be able to access the scanner once your business details are verified.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 font-medium hover:underline"
          >
            Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // If Approved, show the actual scanner
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Wholesaler Terminal</h1>
          <p className="mt-2 text-sm text-gray-600">Scan a vendor&apos;s QR code or enter their manual code to issue goods.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-900 text-white">
            <h2 className="text-lg font-semibold mb-4 text-center">Live Camera Scanner</h2>
            <div id="qr-reader" className="w-full bg-black rounded-lg overflow-hidden border-2 border-gray-700"></div>
          </div>

          <div className="p-6 bg-white">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider text-center">
              Or Enter Manual Code
            </h2>
            <form onSubmit={handleManualSubmit} className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. CC-W38X"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                maxLength={8}
              />
              <button
                type="submit"
                disabled={!manualCode}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition shadow-md"
              >
                Verify
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}