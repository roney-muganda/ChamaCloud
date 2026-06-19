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
  
  // Navigation & User State
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'wallet'>('dashboard');
  const [currentUser, setCurrentUser] = useState<string>('Vendor');
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  
  // RESTORED: Invite Form States
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  
  // Contribution States
  const [isContributing, setIsContributing] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
      const userRes = await fetch(`https://chamacloud-api.onrender.com/api/auth/users/me/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.phone_number || 'Vendor');
      }

      const groupRes = await fetch(`https://chamacloud-api.onrender.com/api/groups/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const groupData = await groupRes.json();

      if (groupRes.ok && Array.isArray(groupData) && groupData.length > 0) {
        const currentGroup = groupData[0];
        setGroup(currentGroup);

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
    const runFetch = async () => {
      await fetchDashboardState(true);
    };
    runFetch();
  }, [fetchDashboardState]);

  // RESTORED: Invite Logic Function
  const handleInvite = async () => {
    if (!invitePhone) return;
    setInviteStatus("Sending invite...");
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`https://chamacloud-api.onrender.com/api/groups/${group?.id}/invite/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone_number: invitePhone })
      });
      
      if (res.ok) {
        setInviteStatus("Invited successfully!");
        setInvitePhone('');
        fetchDashboardState(false);
      } else {
        const data = await res.json();
        setInviteStatus(data.error || "Failed to invite.");
      }
    } catch {
      setInviteStatus("Network error.");
    }
  };

  const submitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeAmount || isNaN(Number(contributeAmount))) return;
    
    setIsProcessing(true);
    setPaymentStatus('Initiating M-Pesa STK Push...');

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`https://chamacloud-api.onrender.com/api/payments/pool/${poolData?.pool_id}/contribute/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: Number(contributeAmount) })
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentStatus('STK Push sent to your phone! Please enter your PIN.');
        setIsContributing(false);
        setContributeAmount('');
      } else {
        setPaymentStatus(data.error || 'Payment failed.');
      }
    } catch {
      setPaymentStatus('Network error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeVouchersCount = vouchers.filter(v => v.status === 'ACTIVE').length;

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-emerald-800 bg-emerald-50">Loading...</div>;
  if (globalError) return <div className="h-screen flex items-center justify-center text-red-600 bg-emerald-50">{globalError}</div>;

  const renderMainContent = () => {
    if (showNewGroupForm || !group) {
      return (
        <div className="w-full max-w-md">
          {group && (
            <button onClick={() => setShowNewGroupForm(false)} className="mb-4 text-emerald-600 font-bold text-sm hover:text-emerald-800 flex items-center">
              ← Back to Dashboard
            </button>
          )}
          <CreateGroupForm onGroupCreated={() => { setShowNewGroupForm(false); fetchDashboardState(true); }} />
        </div>
      );
    }
    
    if (group.member_count < 3) {
      return (
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-emerald-100">
          <h2 className="text-2xl font-black text-emerald-950 mb-2">Grow the Chama!</h2>
          <p className="text-emerald-700 mb-6 font-medium">You need at least 3 members to start a pool. You currently have {group.member_count}.</p>
          <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }} className="space-y-3">
            <input type="text" placeholder="Phone e.g. +254..." className="w-full p-3 bg-gray-50 rounded-xl border border-emerald-100 text-emerald-950 font-bold" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} required />
            <button type="submit" className="w-full bg-emerald-800 text-lime-400 font-bold py-3 rounded-xl hover:bg-emerald-900 transition-colors">Invite Member</button>
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
      <div className="max-w-md w-full bg-white rounded-4xl shadow-2xl p-8 border border-emerald-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-emerald-950 tracking-tighter leading-tight pr-4">{poolData.group_name}</h2>
          <div className="h-14 w-14 shrink-0 bg-linear-to-br from-emerald-100 to-lime-100 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-200">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-emerald-700" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="5" />
              <circle cx="8" cy="15" r="5" />
              <circle cx="16" cy="15" r="5" />
            </svg>
          </div>
        </div>
        <div className="bg-linear-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 mb-8 text-center shadow-xl">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Target Amount</p>
          <p className="text-5xl font-black text-lime-400 tracking-tighter">KES {poolData.target_amount}</p>
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-emerald-900 mb-2">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-5 p-1 shadow-inner">
            <div className="bg-linear-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        {!isContributing ? (
          <button onClick={() => setIsContributing(true)} className="w-full bg-lime-400 text-emerald-950 font-black text-xl py-5 rounded-2xl shadow-lg shadow-lime-200 hover:scale-[1.02] transition-all">
            Contribute Now
          </button>
        ) : (
          <form onSubmit={submitContribution} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <input 
              type="number" 
              placeholder="Amount to contribute (KES)" 
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              className="w-full bg-gray-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-center font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
              min="1"
            />
            <button type="submit" disabled={isProcessing} className="w-full bg-emerald-800 text-lime-400 font-black text-lg py-4 rounded-xl shadow-lg hover:bg-emerald-900 transition-all duration-300 disabled:opacity-50">
              {isProcessing ? 'Processing...' : 'Send M-Pesa Prompt'}
            </button>
            <button type="button" onClick={() => setIsContributing(false)} className="text-gray-400 font-bold text-sm hover:text-emerald-700 transition-colors block w-full text-center mt-2">
              Cancel
            </button>
          </form>
        )}
        
        {paymentStatus && (
          <p className="mt-6 text-center text-sm font-bold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            {paymentStatus}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-emerald-50 flex flex-col lg:flex-row font-sans overflow-hidden">
      <div className={`flex-1 p-6 overflow-y-auto items-center flex-col ${mobileTab === 'dashboard' ? 'flex' : 'hidden lg:flex'} pb-24 lg:pb-6`}>
        <div className="w-full max-w-md flex justify-between items-end mb-8 mt-4">
          <div>
            <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest">Welcome back,</p>
            <h1 className="text-2xl font-black text-emerald-950 truncate max-w-[200px]">{currentUser}</h1>
          </div>
          <button onClick={() => setShowNewGroupForm(true)} className="bg-emerald-100 text-emerald-800 text-xs font-black px-4 py-2 rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200">
            + New Chama
          </button>
        </div>
        {renderMainContent()}
      </div>

      <div className={`w-full lg:w-96 bg-white border-l border-emerald-100 shadow-2xl flex-col ${mobileTab === 'wallet' ? 'flex h-full' : 'hidden lg:flex'} pb-20 lg:pb-0 z-10`}>
        <div className="p-6 border-b border-emerald-50 bg-emerald-900 text-white shrink-0">
          <h2 className="text-2xl font-black tracking-tighter">Voucher Wallet</h2>
          <p className="text-emerald-300 text-sm font-medium mt-1">Your purchasing power.</p>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-gray-50">
          {vouchers.length === 0 ? (
            <p className="text-center text-sm font-bold text-gray-400 mt-10">No vouchers yet.</p>
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

      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-emerald-100 flex justify-around items-center p-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button onClick={() => setMobileTab('dashboard')} className={`flex flex-col items-center gap-1 w-full py-2 ${mobileTab === 'dashboard' ? 'text-emerald-800' : 'text-gray-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">Dashboard</span>
        </button>
        <button onClick={() => setMobileTab('wallet')} className={`flex flex-col items-center gap-1 w-full py-2 relative ${mobileTab === 'wallet' ? 'text-emerald-800' : 'text-gray-400'}`}>
          {activeVouchersCount > 0 && <span className="absolute top-1 right-10 bg-lime-400 text-emerald-950 text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">{activeVouchersCount}</span>}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          <span className="text-[10px] font-black uppercase tracking-widest mt-1">Wallet</span>
        </button>
      </div>
    </div>
  );
}