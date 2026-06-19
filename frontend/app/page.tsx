"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://chamacloud-api.onrender.com/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStep('verify');
        // If your backend bypasses AT for dev, it returns debug_otp
        setMessage(data.debug_otp ? `Dev OTP: ${data.debug_otp}` : "OTP sent to your phone!");
      } else {
        setError(data.error || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('https://chamacloud-api.onrender.com/api/auth/verify-otp/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, otp, username: username || 'User' })
      });
      
      const data = await res.json();
      
      if (res.ok && data.access) {
        // Securely store the token
        localStorage.setItem('access_token', data.access);
        
        // Traffic Cop Logic: Route based on user role
        if (data.is_wholesaler) {
          router.push('/wholesaler/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error || 'Invalid OTP.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 border border-emerald-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-lime-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">🥬</div>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tighter">Chama Cloud</h1>
          <p className="text-emerald-600 font-medium mt-2">Vendors, log in to access your pools.</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold text-center">{error}</div>}
        {message && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-bold text-center font-mono">{message}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Phone Number</label>
              <input 
                type="text" 
                placeholder="+254711111111" 
                className="w-full p-4 bg-gray-50 border border-emerald-100 rounded-xl font-bold text-emerald-950 focus:ring-2 focus:ring-lime-400 outline-none transition-all"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-lime-400 text-emerald-950 font-black text-lg py-4 rounded-xl shadow-lg shadow-lime-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:transform-none"
            >
              {loading ? 'Sending...' : 'Get Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
             <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Your Name (If new user)</label>
              <input 
                type="text" 
                placeholder="e.g. Mary" 
                className="w-full p-4 bg-gray-50 border border-emerald-100 rounded-xl font-bold text-emerald-950 focus:ring-2 focus:ring-lime-400 outline-none transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Enter 4-Digit OTP</label>
              <input 
                type="text" 
                placeholder="1234" 
                className="w-full p-4 bg-gray-50 border border-emerald-100 rounded-xl font-black text-emerald-950 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-lime-400 outline-none transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={4}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-800 text-lime-400 font-black text-lg py-4 rounded-xl shadow-lg hover:bg-emerald-900 active:scale-[0.98] transition-all duration-300 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:transform-none"
            >
              {loading ? 'Verifying...' : 'Secure Login'}
            </button>
          </form>
        )}

        {/* The Wholesaler Gateway */}
        <div className="mt-8 pt-6 border-t border-emerald-50 text-center">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-3">Partner with us</p>
          <Link href="/wholesaler/apply">
            <button className="w-full bg-emerald-50 text-emerald-900 border-2 border-emerald-100 font-bold py-4 rounded-xl hover:bg-emerald-100 transition-all duration-200">
              Apply as a Wholesaler
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}