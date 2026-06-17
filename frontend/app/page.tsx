"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        // Securely store the token and redirect to dashboard
        localStorage.setItem('access_token', data.access);
        router.push('/dashboard');
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-900">Chama Cloud</h1>
          <p className="text-gray-500 mt-2">Empowering Wholesale Vendors</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        {message && <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-mono">{message}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                type="text" 
                placeholder="+254711111111" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {loading ? 'Sending...' : 'Get Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (If new user)</label>
              <input 
                type="text" 
                placeholder="Mary" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter 4-Digit OTP</label>
              <input 
                type="text" 
                placeholder="1234" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black text-center text-xl tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={4}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-green-300"
            >
              {loading ? 'Verifying...' : 'Secure Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}