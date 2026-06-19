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

interface GroupData {
  id: number;
  name: string;
  member_count: number;
}

export default function Dashboard() {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const fetchDashboardState = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setGlobalError(null);
    const token = localStorage.getItem('access_token'); 
    
    if (!token) {
      setGlobalError("Please log in to view your Chama.");
      setLoading(false);
      return;
    }

    try {
      const groupRes = await fetch(`https://chamacloud-api.onrender.com/api/groups/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groupData = await groupRes.json();

      if (groupRes.ok && Array.isArray(groupData) && groupData.length > 0) {
        const currentGroup = groupData[0];
        setGroup(currentGroup);

        // Only check for pool if they have enough members
        if (currentGroup.member_count >= 3) {
          const poolRes = await fetch(`https://chamacloud-api.onrender.com/api/pools/active/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const poolJson = await poolRes.json();
          setPoolData(poolRes.ok && !poolJson.error ? poolJson : null);
        } else {
          setPoolData(null);
        }
      } else {
        setGroup(null);
        setPoolData(null);
      }
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    const initTimer = setTimeout(() => fetchDashboardState(false), 0);
    return () => clearTimeout(initTimer);
  }, [fetchDashboardState]);

  const handleInvite = async () => {
    if (!invitePhone || !group) return;
    setInviteStatus('Sending...');
    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/groups/${group.id}/invite/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone_numbers: [invitePhone] })
      });
      const data = await res.json();
      setInviteStatus(data.message || 'Invite sent!');
      setInvitePhone('');
      if (res.ok) fetchDashboardState(true);
    } catch {
      setInviteStatus('Failed to send invite.');
    }
  };

  const handleContribute = async () => {
    if (!poolData?.pool_id) return;
    setPaymentStatus('Initiating M-Pesa STK Push...');
    try {
      const res = await fetch(`https://chamacloud-api.onrender.com/api/payments/pool/${poolData.pool_id}/contribute/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      setPaymentStatus(res.ok ? 'STK Push sent!' : data.error || 'Failed.');
    } catch {
      setPaymentStatus('Network error.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-emerald-800">Loading...</div>;
  if (globalError) return <div className="min-h-screen flex items-center justify-center text-red-600">{globalError}</div>;

  // STATE 0: No Group
  if (!group) {
    return (
      <div className="min-h-screen bg-emerald-950 p-4 flex items-center justify-center">
        <CreateGroupForm onGroupCreated={() => fetchDashboardState(true)} />
      </div>
    );
  }

  // STATE 1: Group exists, check if members >= 3
  if (group.member_count < 3) {
    return (
      <div className="min-h-screen bg-emerald-950 p-6 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-emerald-100">
          <h2 className="text-2xl font-black text-emerald-950 mb-2">Grow the Chama!</h2>
          <p className="text-emerald-700 mb-6 font-medium">You need at least 3 members to start a pool. You currently have {group.member_count}.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }} className="space-y-3">
            <input type="text" placeholder="Phone e.g. +254..." className="w-full p-3 bg-gray-50 rounded-xl border border-emerald-100 text-emerald-950 font-bold" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} required />
            <button className="w-full bg-emerald-800 text-lime-400 font-bold py-3 rounded-xl hover:bg-emerald-900">Invite Member</button>
          </form>
          {inviteStatus && <p className="mt-4 text-sm font-bold text-emerald-600">{inviteStatus}</p>}
        </div>
      </div>
    );
  }

  // STATE 2: Group ready, but no pool
  if (!poolData) {
    return (
      <div className="min-h-screen bg-emerald-950 p-4 flex items-center justify-center">
        <CreatePoolForm groupId={group.id} onPoolCreated={() => fetchDashboardState(true)} />
      </div>
    );
  }

  // STATE 3: Luminous Dashboard (Active Pool)
  const collected = poolData?.collected || 0;
  const target = poolData?.target_amount || 1; 
  const progressPercentage = Math.min((collected / target) * 100, 100);

  return (
    <div className="min-h-screen bg-emerald-50 p-6 font-sans flex items-center justify-center">
      <div className="max-w-md w-full mx-auto bg-white rounded-[2rem] shadow-2xl p-8 border border-emerald-100">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-emerald-950 tracking-tighter leading-tight pr-4">
            {poolData.group_name}
          </h2>
          <div className="h-14 w-14 flex-shrink-0 bg-lime-100 rounded-full flex items-center justify-center text-2xl shadow-inner">🥬</div>
        </div>

        {/* Big Amount Card */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 mb-8 text-center shadow-xl">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Target Amount</p>
          <p className="text-5xl font-black text-lime-400 tracking-tighter">KES {poolData.target_amount}</p>
        </div>

        {/* Animated Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-emerald-900 mb-2">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-5 p-1 shadow-inner">
            <div 
              className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out shadow-lg" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleContribute}
          className="w-full bg-lime-400 text-emerald-950 font-black text-xl py-5 rounded-2xl shadow-lg shadow-lime-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          Contribute Now
        </button>
        
        {/* Status Message */}
        {paymentStatus && (
          <p className={`mt-6 text-center text-sm font-bold p-4 rounded-xl ${
            paymentStatus.includes('error') || paymentStatus.includes('Failed') 
              ? 'bg-red-50 text-red-600 border border-red-100' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}>
            {paymentStatus}
          </p>
        )}
        
      </div>
    </div>
  );
}