"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function WholesalerApplication() {
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    location: '',
    productCategories: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // We will create this backend endpoint next!
      const res = await fetch('https://chamacloud-api.onrender.com/api/wholesalers/apply/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-emerald-100">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-black text-emerald-950 mb-2">Application Received!</h2>
          <p className="text-emerald-700 font-medium mb-8">Our team will review your business profile and contact you within 24 hours to finalize your onboarding.</p>
          <Link href="/">
            <button className="w-full bg-lime-400 text-emerald-950 font-black py-4 rounded-xl shadow-lg shadow-lime-200">Return Home</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 p-4 font-sans flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 p-8 text-center">
          <h1 className="text-3xl font-black text-lime-400 tracking-tighter">Become a Supplier</h1>
          <p className="text-emerald-100 font-medium mt-2">Sell in bulk directly to Chama groups.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {status === 'error' && <p className="text-red-500 text-sm font-bold text-center">Failed to submit. Please try again.</p>}

          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Business Name</label>
            <input type="text" required className="w-full p-4 bg-gray-50 border border-emerald-100 rounded-xl font-bold text-emerald-950 focus:ring-2 focus:ring-lime-400 outline-none" value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Business Phone</label>
            <input type="text" placeholder="+254..." required className="w-full p-4 bg-gray-50 border border-emerald-100 rounded-xl font-bold text-emerald-950 focus:ring-2 focus:ring-lime-400 outline-none" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Market Location</label>
            <input type="text" placeholder="e.g. Marikiti, Nairobi" required className="w-full p-4 bg-gray-50 border border-emerald-100 rounded-xl font-bold text-emerald-950 focus:ring-2 focus:ring-lime-400 outline-none" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
          </div>

          <button type="submit" disabled={status === 'loading'} className="w-full bg-lime-400 text-emerald-950 font-black text-lg py-4 rounded-xl shadow-lg shadow-lime-200 mt-4 disabled:bg-gray-300">
            {status === 'loading' ? 'Submitting...' : 'Submit Application'}
          </button>
          
          <div className="text-center mt-4">
            <Link href="/" className="text-sm font-bold text-emerald-600 hover:text-emerald-800">← Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}