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
  const [allGroups, setAllGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [vouchers, setVouchers] = useState<VoucherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // NEW: Track if they have an active pool ANYWHERE
  const [globalActiveGroupId, setGlobalActiveGroupId] = useState<number | null>(null);
  
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'wallet'>('dashboard');
  const [currentUser, setCurrentUser] = useState<string>('Vendor');
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');
  
  const [isContributing, setIsContributing] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');

  const fetchDashboardState = useCallback(async (showLoader = false, forceGroupId: number | null = null) => {
    if (showLoader) setLoading(true);
    setGlobalError(null);
    const token = localStorage.getItem('access_token'); 
    
    if (!token) {
      setGlobalError("Please log in to view your Chama.");
      setLoading(false);
      return;
    }

    try {
      const userRes = await fetch(`https://chamacloud-api.onrender.com/api/auth/users/me/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData.phone_number || 'Vendor');
      }

      // 1. FIRST check if they have an active pool ANYWHERE in their account
      let activeGroupIdGlobally = null;
      try {
        const globalPoolRes = await fetch(`https://chamacloud-api.onrender.com/api/pools/active/`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (globalPoolRes.ok) {
          const globalData = await globalPoolRes.json();
          if (!globalData.error && globalData.group_id) {
            activeGroupIdGlobally = globalData.group_id;
          }
        }
      } catch(e) {}
      setGlobalActiveGroupId(activeGroupIdGlobally);

      // 2. Fetch all groups
      const groupRes = await fetch(`https://chamacloud-api.onrender.com/api/groups/`, { headers: { 'Authorization': `Bearer ${token}` } });
      const groupData = await groupRes.json();

      if (groupRes.ok && Array.isArray(groupData) && groupData.length > 0) {
        const sortedGroups = groupData.sort((a, b) => b.id - a.id);
        setAllGroups(sortedGroups);

        // Auto-select logic: Forced > Global Active Pool > Currently Selected > Newest
        let activeId = forceGroupId;
        if (activeId === -1) {
            activeId = sortedGroups[0].id;
        } else if (!activeId) {
            activeId = activeGroupIdGlobally || selectedGroupId || sortedGroups[0].id;
        }

        const currentGroup = sortedGroups.find(g => g.id === activeId) || sortedGroups[0];
        setSelectedGroupId(currentGroup.id);
        setGroup(currentGroup);

        if (currentGroup.member_count >= 3) {
          const poolRes = await fetch(`https://chamacloud-api.onrender.com/api/pools/active/?group_id=${currentGroup.id}`, { headers: { 'Authorization': `Bearer ${token}` } });
          const poolJson = await poolRes.json();
          setPoolData(poolRes.ok && !poolJson.error ? poolJson : null);
        } else {
          setPoolData(null);
        }
      } else {
        setAllGroups([]);
        setGroup(null);
        setPoolData(null);
      }

      const voucherRes = await fetch(`https://chamacloud-api.onrender.com/api/vouchers/my-vouchers/`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (voucherRes.ok) {
        const voucherJson = await voucherRes.json();
        setVouchers(voucherJson);
      }
    } catch {
      setGlobalError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]); 

  useEffect(() => {
    const runFetch = async () => { await fetchDashboardState(true); };
    runFetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInvite = async () => {
    if (!invitePhone) return;
    setInviteStatus("Sending invite...");
    
    // 1. Auto-format 07xx to +2547xx for the backend
    let formattedPhone = invitePhone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('254')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+254' + formattedPhone;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`https://chamacloud-api.onrender.com/api/groups/${group?.id}/invite/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        // 2. Send as an array (phone_numbers) to satisfy the backend
        body: JSON.stringify({ phone_numbers: [formattedPhone], phone_number: formattedPhone }) 
      });
      
      if (res.ok) {
        setInviteStatus("Invited successfully!");
        setInvitePhone('');
        fetchDashboardState(false);
      } else {
        const data = await res.json();
        setInviteStatus(data.error || "Failed to invite.");
      }
    } catch { setInviteStatus("Network error."); }
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(contributeAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentStatus('STK Push sent to your phone! Please enter your PIN.');
        setIsContributing(false);
        setContributeAmount('');
      } else { setPaymentStatus(data.error || 'Payment failed.'); }
    } catch { setPaymentStatus('Network error. Please try again.'); } 
    finally { setIsProcessing(false); }
  };

  const activeVouchersCount = vouchers.filter(v => v.status === 'ACTIVE').length;

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-emerald-800 bg-emerald-50">Loading...</div>;
  if (globalError) return <div className="h-screen flex items-center justify-center text-red-600 bg-emerald-50">{globalError}</div>;

  const renderMainContent = () => {
    if (showNewGroupForm || !group) {
      return (
        <div className="w-full max-w-md">
          {group && <button onClick={() => setShowNewGroupForm(false)} className="mb-4 text-emerald-600 font-bold text-sm hover:text-emerald-800 flex items-center">← Back to Dashboard</button>}
          <CreateGroupForm onGroupCreated={() => { setShowNewGroupForm(false); fetchDashboardState(true, -1); }} />
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
      // NEW: If they try to start a pool but one is active elsewhere, block them gracefully.
      if (globalActiveGroupId && globalActiveGroupId !== group.id) {
        return (
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-amber-200 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
             <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <h2 className="text-xl font-black text-amber-950 mb-2">Active Pool Exists</h2>
             <p className="text-amber-800 text-sm font-medium">You already have an active funding pool running in another Chama. You must complete it before starting a new one here.</p>
             <button onClick={() => fetchDashboardState(true, globalActiveGroupId)} className="mt-6 w-full bg-amber-100 text-amber-900 font-bold py-3 rounded-xl hover:bg-amber-200 transition-colors text-sm">Return to Active Pool</button>
          </div>
        );
      }
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
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-emerald-700" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><circle cx="8" cy="15" r="5" /><circle cx="16" cy="15" r="5" /></svg>
          </div>
        </div>
        <div className="bg-linear-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 mb-8 text-center shadow-xl">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Target Amount</p>
          <p className="text-5xl font-black text-lime-400 tracking-tighter">KES {poolData.target_amount}</p>
        </div>
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-emerald-900 mb-2"><span>Progress</span><span>{progressPercentage.toFixed(0)}%</span></div>
          <div className="w-full bg-emerald-100 rounded-full h-5 p-1 shadow-inner"><div className="bg-linear-to-r from-lime-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out shadow-lg" style={{ width: `${progressPercentage}%` }}></div></div>
        </div>

        {!isContributing ? (
          <button onClick={() => setIsContributing(true)} className="w-full bg-lime-400 text-emerald-950 font-black text-xl py-5 rounded-2xl shadow-lg shadow-lime-200 hover:scale-[1.02] transition-all">Contribute Now</button>
        ) : (
          <form onSubmit={submitContribution} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <input type="number" placeholder="Amount to contribute (KES)" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} className="w-full bg-gray-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-center font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" required min="1" />
            <button type="submit" disabled={isProcessing} className="w-full bg-emerald-800 text-lime-400 font-black text-lg py-4 rounded-xl shadow-lg hover:bg-emerald-900 transition-all duration-300 disabled:opacity-50">
              {isProcessing ? 'Processing...' : 'Send M-Pesa Prompt'}
            </button>
            <button type="button" onClick={() => setIsContributing(false)} className="text-gray-400 font-bold text-sm hover:text-emerald-700 transition-colors block w-full text-center mt-2">Cancel</button>
          </form>
        )}
        {paymentStatus && <p className="mt-6 text-center text-sm font-bold text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{paymentStatus}</p>}
      </div>
    );
  };

  return (
    <div className="h-screen bg-emerald-50 flex flex-col lg:flex-row font-sans overflow-hidden">
      <div className={`flex-1 p-6 overflow-y-auto items-center flex-col ${mobileTab === 'dashboard' ? 'flex' : 'hidden lg:flex'} pb-24 lg:pb-6`}>
        <div className="w-full max-w-md flex justify-between items-end mb-8 mt-4">
          <div className="flex-1 mr-4 overflow-hidden">
            <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-1">Welcome back, {currentUser}</p>
            {allGroups.length > 0 ? (
              <select 
                className="bg-transparent text-2xl font-black text-emerald-950 w-full outline-none cursor-pointer border-b-2 border-dashed border-emerald-200 pb-1 appearance-none"
                value={selectedGroupId || ''}
                onChange={(e) => fetchDashboardState(true, Number(e.target.value))}
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23065f46%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .5rem top 50%', backgroundSize: '.65rem auto', paddingRight: '1.5rem' }}
              >
                {allGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            ) : (
              <h1 className="text-2xl font-black text-emerald-950 truncate">No Chama Yet</h1>
            )}
          </div>
          
          {/* NEW: Hide "+ New Chama" if an active pool exists anywhere */}
          {!globalActiveGroupId && (
            <button onClick={() => setShowNewGroupForm(true)} className="bg-emerald-100 text-emerald-800 text-xs font-black px-4 py-2 rounded-lg hover:bg-emerald-200 transition-colors border border-emerald-200 shrink-0 mb-1 shadow-sm">
              + New Chama
            </button>
          )}
        </div>

        {renderMainContent()}
      </div>

      {/* Sidebar logic remains identical */}
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
                  <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${v.status === 'ACTIVE' ? 'bg-lime-100 text-lime-800' : 'bg-gray-200 text-gray-600'}`}>{v.status}</span>
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

      {/* Mobile nav remains identical */}
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