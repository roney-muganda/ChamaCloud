import { useState } from 'react';

interface CreatePoolFormProps {
  groupId: number;
  onPoolCreated: () => void; // Function to refresh the dashboard after creation
}

export const CreatePoolForm: React.FC<CreatePoolFormProps> = ({ groupId, onPoolCreated }) => {
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amount = parseInt(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid target amount.");
      setLoading(false);
      return;
    }

    // Automatically calculate contribution so the backend math passes
    // We assume 3 members as the minimum threshold
    const autoContribution = Math.ceil(amount / 3);

    try {
      const res = await fetch('https://chamacloud-api.onrender.com/api/pools/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          group_id: groupId,
          target_amount: amount,
          contribution_per_member: autoContribution, // Calculated value
          deadline: "2026-12-31 23:59:59",
          status: 'OPEN'
        })
      });

      const data = await res.json();

      if (res.ok) {
        setTargetAmount('');
        onPoolCreated(); 
      } else {
        // This will now show the specific error from the backend if it still fails
        setError(data.error || 'Failed to create the pool.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-50">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-lime-100 rounded-lg">
          <span className="text-xl">🥬</span>
        </div>
        <h3 className="text-lg font-bold text-emerald-950">Start Fresh Produce Pool</h3>
      </div>
      
      <p className="text-sm text-emerald-700 mb-6">
        Set a target amount to pool funds together. Once the target is hit, everyone gets their vouchers instantly.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="target_amount" className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            Target Amount (KES)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-emerald-600 font-bold">KES</span>
            <input
              id="target_amount"
              type="number"
              required
              min="1"
              step="1"
              placeholder="15000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full pl-14 pr-4 py-3 border border-emerald-200 rounded-xl font-bold text-lg text-emerald-950 focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !targetAmount}
          className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-emerald-950 bg-lime-400 hover:bg-lime-500 focus:outline-none transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {loading ? 'Opening Pool...' : 'Open Funding Pool'}
        </button>
      </form>
    </div>
  );
};