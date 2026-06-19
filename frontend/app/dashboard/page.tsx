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

interface VoucherData {
  id: string;
  code: string;
  amount: number;
  status: string;
  group_name: string;
  created_at: string;
}

export default function Dashboard() {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
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
      // 1. Fetch Groups
      const groupRes = await fetch(`https://chamacloud-api.onrender.com/api/groups/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groupData = await groupRes.json();

      if (groupRes.ok && Array.isArray(groupData) && groupData.length > 0) {
        const currentGroup = groupData[0];
        setGroup(currentGroup);

        // 2. Fetch Active Pool
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

      // 3. Fetch Vouchers for the Sidebar
      const voucherRes = await fetch(`https://chamacloud-api.onrender.com/api/vouchers/my-vouchers/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (voucherRes.ok) {
        const voucherJson = await voucherRes.json();
        setVouchers(voucherJson);
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

  const handleInvite = async () => { /* ... existing invite logic ... */ };
  const handleContribute = async () => { /* ... existing contribute logic ... */ };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-emerald-800">Loading...</div>;
  if (globalError) return <div className="min-h-screen flex items-center justify-center text-red-600">{globalError}</div>;

  // Render the Main Content area based on state
  const renderMainContent = () => {
    if (!group) {
      return <CreateGroupForm onGroupCreated={() => fetchDashboardState(true)} />;
    }
    if (group.member_count < 3) {
      return (
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-emerald-100">
          <h2 className="text-2xl font-black text-emerald-950 mb-2">Grow the Chama!</h2>
          <p className="text-emerald-700 mb-6 font-medium">You need at least 3 members to start a pool. You currently have {group.member_count}.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }} className="space-y-3">
            <input type="text" placeholder="Phone e.g. +254..." className="w-full p-3 bg-gray-50 rounded-xl border border-emerald-100 text-emerald-950 font-bold" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} required />
            <button className="w-full bg-emerald-800 text-lime-400 font-bold py-3 rounded-xl hover:bg-emerald-900">Invite Member</button>
          </form>
          {inviteStatus && <p className="mt-4 text-sm font-bold text-emerald-600">{inviteStatus}</p>}
        </div>
      );
    }
    if (!poolData) {
      return <CreatePoolForm groupId={group.id} onPoolCreated={() => fetchDashboardState(true)} />;
    }

    const collected = poolData?.collected || 0;
    const target = poolData?.target_amount || 1; 
    const progressPercentage = Math.min((collected / target) * 100, 100);

    return (
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 border border-emerald-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-emerald-950 tracking-tighter leading-tight pr-4">{poolData.group_name}</h2>
          <div className="h-14 w-14 flex-shrink-0 bg-gradient-to-br from-emerald-100 to-lime-100 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-200">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-emerald-700" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="5" />
              <circle cx="8" cy="15" r="5" />
              <circle cx="16" cy="15" r="5" />
            </svg>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 mb-8 text-center shadow-xl">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Target Amount</p>
          <p className="text-5xl font-black text-lime-400 tracking-tighter">KES {poolData.target_amount}</p>
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-emerald-900 mb-2">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-5 p-1 shadow-inner">
            <div className="bg-gradient-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
        <button onClick={handleContribute} className="w-full bg-lime-400 text-emerald-950 font-black text-xl py-5 rounded-2xl shadow-lg shadow-lime-200 hover:scale-[1.02] transition-all">
          Contribute Now
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex font-sans overflow-hidden">
      
      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        {renderMainContent()}
      </div>

      {/* NEW: Voucher Wallet Sidebar */}
      <div className="w-96 bg-white border-l border-emerald-100 shadow-2xl flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-emerald-50 bg-emerald-900 text-white">
          <h2 className="text-2xl font-black tracking-tighter">Voucher Wallet</h2>
          <p className="text-emerald-300 text-sm font-medium mt-1">Your purchasing power.</p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-gray-50">
          {vouchers.length === 0 ? (
            <p className="text-center text-sm font-bold text-gray-400 mt-10">No vouchers yet. Complete a pool to unlock one!</p>
          ) : (
            vouchers.map(v => (
              <div key={v.id} className={`p-5 rounded-2xl border ${v.status === 'ACTIVE' ? 'bg-white border-lime-400 shadow-lg' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${v.status === 'ACTIVE' ? 'bg-lime-100 text-lime-800' : 'bg-gray-200 text-gray-600'}`}>
                    {v.status}
                  </span>
                  <span className="text-xs font-bold text-gray-400">{v.created_at}</span>
                </div>
                <h3 className="text-3xl font-black tracking-tighter text-emerald-950 my-2">KES {v.amount}</h3>
                <p className="text-sm font-bold text-emerald-700">{v.group_name}</p>
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Redemption Code</p>
                  <p className="font-mono font-black text-lg text-emerald-900 tracking-widest">{v.code}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}