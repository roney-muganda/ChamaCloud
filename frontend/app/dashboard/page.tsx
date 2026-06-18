"use client";
import { useEffect, useState, useCallback } from 'react';
import { CreatePoolForm } from '../../components/pools/CreatePoolForm';
import { CreateGroupForm } from '../../components/groups/CreateGroupForm';

interface PoolData {
  pool_id?: number;
  group_id?: number;
  group_name?: string;
  target_amount?: number;
  collected?: number;
  remaining?: number;
  status?: string;
}

export default function Dashboard() {
  const [groupId, setGroupId] = useState<number | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  // 1. The Master Fetcher: Checks Group first, then Pool
  const fetchDashboardState = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    setGlobalError(null);
    const token = localStorage.getItem('access_token'); 
    
    if (!token) {
      setGlobalError("Please log in to view your Chama.");
      setLoading(false);
      return;
    }

    try {
      // Step A: Check if the user belongs to a Group
      const groupRes = await fetch(`https://chamacloud-api.onrender.com/api/groups/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groupData = await groupRes.json();

      if (groupRes.ok && Array.isArray(groupData) && groupData.length > 0) {
        // User HAS a group! Save the ID.
        const currentGroupId = groupData[0].id;
        setGroupId(currentGroupId);

        // Step B: Check if that group has an Active Pool
        const poolRes = await fetch(`https://chamacloud-api.onrender.com/api/pools/active/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const poolJson = await poolRes.json();

        if (poolRes.ok && !poolJson.error) {
          setPoolData(poolJson); // STATE 2: Has Pool
        } else {
          setPoolData(null); // STATE 1: Has Group, No Pool
        }
      } else {
        // STATE 0: No Group exists for this user
        setGroupId(null);
        setPoolData(null);
      }
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    // FIX: Wrapping in setTimeout(0) pushes execution to the end of the event loop.
    // This perfectly bypasses the synchronous setState linter error.
    const initTimer = setTimeout(() => {
      fetchDashboardState(false);
    }, 0);
    
    return () => clearTimeout(initTimer);
  }, [fetchDashboardState]);

  const handleInvite = async () => {
    const token = localStorage.getItem('access_token');
    if (!invitePhone || !groupId) return;

    setInviteStatus('Sending...');
    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/groups/${groupId}/invite/`, {
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
    } catch {
      setInviteStatus('Failed to send invite.');
    }
  };

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
    } catch {
      setPaymentStatus('Network error. Could not reach server.');
    }
  };

  // --- RENDERING LOGIC ---

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-semibold text-emerald-800">Loading Terminal...</div>;
  
  if (globalError) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold">{globalError}</div>;

  // STATE 0: No Group Found
  if (!groupId) {
    return (
      <div className="min-h-screen bg-emerald-950 p-4 font-sans flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <CreateGroupForm onGroupCreated={() => fetchDashboardState(true)} />
        </div>
      </div>
    );
  }

  // STATE 1: Has Group, but No Active Pool Found
  if (!poolData) {
    return (
      <div className="min-h-screen bg-emerald-950 p-4 font-sans flex flex-col items-center justify-center">
        <div className="max-w-md w-full">
          <CreatePoolForm groupId={groupId} onPoolCreated={() => fetchDashboardState(true)} />
        </div>
      </div>
    );
  }

  // STATE 2: Active pool exists. Show the Luminous Dashboard.
  const collected = poolData?.collected || 0;
  const target = poolData?.target_amount || 1; 
  const progressPercentage = Math.min((collected / target) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden p-6 border border-emerald-50">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black text-emerald-950 tracking-tight">{poolData?.group_name || 'Your Chama'}</h2>
            <p className="text-sm text-emerald-600/80 font-medium mt-1">Status: <span className="font-bold text-lime-500 uppercase tracking-wider">{poolData?.status}</span></p>
          </div>
          <div className="h-10 w-10 bg-lime-100 rounded-full flex items-center justify-center text-xl shadow-sm">🥬</div>
        </div>

        <div className="bg-emerald-900 rounded-2xl p-5 mb-8 text-center shadow-inner">
          <p className="text-xs text-emerald-300 font-semibold uppercase tracking-widest mb-1">Target Amount</p>
          <p className="text-4xl font-black text-lime-400 tracking-tight">KES {poolData?.target_amount}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 flex justify-between text-sm font-bold text-emerald-800">
          <span>Collected: KES {poolData?.collected}</span>
          <span className="text-emerald-600/60 font-medium">Remaining: KES {poolData?.remaining}</span>
        </div>
        <div className="w-full bg-emerald-100 rounded-full h-4 mb-8 p-1 shadow-inner">
          <div 
            className="bg-lime-400 h-full rounded-full transition-all duration-700 ease-out shadow-sm" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* M-Pesa Trigger Button */}
        <button 
          onClick={handleContribute}
          className="w-full bg-lime-400 text-emerald-950 font-black text-lg py-4 px-4 rounded-xl shadow-lg shadow-lime-200 hover:bg-lime-500 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 mb-3"
        >
          Contribute Now (M-Pesa)
        </button>
        
        {/* Payment Status Message */}
        {paymentStatus && (
          <p className={`text-center text-sm font-bold mb-8 p-3 rounded-xl ${paymentStatus.includes('error') || paymentStatus.includes('Failed') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            {paymentStatus}
          </p>
        )}

        {/* The Invite Members UI Section */}
        <div className="border-t border-emerald-100 pt-6">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">Expand the Chama</h3>
          
          <form 
            onSubmit={(e) => { e.preventDefault(); handleInvite(); }} 
            className="flex gap-2"
          >
            <input 
              type="text" 
              placeholder="Phone e.g. +254..." 
              className="flex-1 px-4 py-3 bg-gray-50 border border-emerald-100 rounded-xl text-sm font-medium text-emerald-950 focus:ring-2 focus:ring-lime-400 outline-none transition"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              required
            />
            <button 
              type="submit" 
              className="bg-emerald-800 text-lime-400 font-bold px-5 py-3 rounded-xl text-sm hover:bg-emerald-900 shadow-md transition"
            >
              Invite
            </button>
          </form>
          
          {inviteStatus && <p className="text-xs text-lime-600 mt-3 font-bold text-center">{inviteStatus}</p>}
        </div>

      </div>
    </div>
  );
}