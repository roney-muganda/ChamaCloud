"use client";
import { useEffect, useState } from 'react';

// 1. Fix the 'any' error by defining exactly what the backend returns
interface PoolData {
  pool_id?: number;
  group_id?: number;
  group_name?: string;
  target_amount?: number;
  collected?: number;
  remaining?: number;
  status?: string;
  deadline?: string;
  error?: string; // For handling our custom error states
}

export default function Dashboard() {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(''); // NEW: Tracks STK push status

  useEffect(() => {
    // This hook only handles loading the initial data
    const fetchActivePool = async () => {
      const token = localStorage.getItem('access_token'); 
      
      if (!token) {
        setPoolData({ error: "Please log in to view your Chama." });
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`https://chamacloud-api.onrender.com/api/pools/active/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await res.json();
        setPoolData(data);
      } catch (err) {
        console.error("Failed to fetch pool", err);
        setPoolData({ error: "Network error. Please try again." });
      } finally {
        setLoading(false);
      }
    };

    fetchActivePool();
  }, []); // End of useEffect

  // 2. The invite handler 
  const handleInvite = async () => {
    const token = localStorage.getItem('access_token');
    if (!invitePhone || !poolData?.group_id) return;

    setInviteStatus('Sending...');
    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/groups/${poolData.group_id}/invite/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone_numbers: [invitePhone] })
      });
      const data = await res.json();
      setInviteStatus(data.message || 'Invite sent!');
      setInvitePhone('');
    } catch (err) {
      setInviteStatus('Failed to send invite.');
    }
  };

  // 3. NEW: M-Pesa STK Push Trigger
  const handleContribute = async () => {
    const token = localStorage.getItem('access_token');
    if (!poolData?.pool_id) return;

    setPaymentStatus('Initiating M-Pesa STK Push...');
    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/payments/pool/${poolData.pool_id}/contribute/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        setPaymentStatus('STK Push sent! Please check your phone to enter your PIN.');
      } else {
        setPaymentStatus(data.error || 'Failed to initiate payment.');
      }
    } catch (err) {
      setPaymentStatus('Network error. Could not reach server.');
    }
  };

  if (loading) return <div className="p-6 text-center font-semibold text-gray-600">Loading Chama Data...</div>;
  
  if (poolData?.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 font-sans flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 text-center border border-gray-100">
          <p className="text-gray-800 font-medium mb-4">{poolData.error}</p>
          <button className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition">
            Create a New Pool
          </button>
        </div>
      </div>
    );
  }

  // We need to provide fallback values of 0 to make TypeScript happy before math operations
  const collected = poolData?.collected || 0;
  const target = poolData?.target_amount || 1; // Prevent division by zero
  const progressPercentage = Math.min((collected / target) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">{poolData?.group_name}</h2>
        <p className="text-sm text-gray-500 mb-6">Status: <span className="font-semibold text-green-600">{poolData?.status}</span></p>

        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center">
          <p className="text-sm text-blue-600 font-medium">Target Amount</p>
          <p className="text-3xl font-extrabold text-blue-900">KES {poolData?.target_amount}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 flex justify-between text-sm font-medium text-gray-700">
          <span>Collected: KES {poolData?.collected}</span>
          <span>Remaining: KES {poolData?.remaining}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-8">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* M-Pesa Trigger Button */}
        <button 
          onClick={handleContribute}
          className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow hover:bg-green-700 transition mb-2"
        >
          Contribute Now (M-Pesa)
        </button>
        {/* Payment Status Message */}
        {paymentStatus && (
          <p className={`text-center text-sm font-medium mb-6 ${paymentStatus.includes('error') || paymentStatus.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
            {paymentStatus}
          </p>
        )}

        {/* 3. The Invite Members UI Section */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2">Invite a Vendor to Chama</h3>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault(); // Prevents Next.js from refreshing the page
              handleInvite();     // Executes your API call function
            }} 
            className="flex gap-2"
          >
            <input 
              type="text" 
              placeholder="Phone e.g. +254..." 
              className="flex-1 px-3 py-2 border rounded-lg text-sm text-black"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              required
            />
            <button 
              type="submit" // Strictly tells the form to execute onSubmit
              className="bg-blue-100 text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-200 transition"
            >
              Invite
            </button>
          </form>
          
          {inviteStatus && <p className="text-xs text-green-600 mt-2 font-medium">{inviteStatus}</p>}
        </div>

      </div>
    </div>
  );
}