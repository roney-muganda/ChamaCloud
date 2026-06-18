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
            <input type="text" placeholder="Phone e.g. +254..." className="w-full p-3 bg-gray-50 rounded-xl border border-emerald-100" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} required />
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

  // STATE 3: Active Pool Dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-6">
        <h2 className="text-2xl font-black text-emerald-950">{poolData.group_name}</h2>
        <div className="bg-emerald-900 rounded-2xl p-5 my-6 text-center">
          <p className="text-lime-400 text-4xl font-black">KES {poolData.target_amount}</p>
        </div>
        <button onClick={handleContribute} className="w-full bg-lime-400 font-black py-4 rounded-xl">Contribute Now</button>
        {paymentStatus && <p className="mt-4 text-center font-bold text-sm">{paymentStatus}</p>}
      </div>
    </div>
  );
}