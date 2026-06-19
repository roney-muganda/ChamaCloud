import { useState } from 'react';

interface CreateGroupFormProps {
  onGroupCreated: () => void;
}

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('https://chamacloud-api.onrender.com/api/groups/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name: groupName,
          description: "Fresh Produce Chama" // Default description
        })
      });

      const data = await res.json();

      if (res.ok || res.status === 201) {
        onGroupCreated(); // Trigger dashboard refresh
      } else {
        setError(data.error || 'Failed to create group. Please try again.');
      }
    } catch {
      setError('Network error. Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-50">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 flex-shrink-0 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mr-4 border border-emerald-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-emerald-950">Start a New Chama</h3>
          <p className="text-xs text-emerald-600 font-medium">Create your wholesale buying group</p>
        </div>
      </div>
      
      <p className="text-sm text-emerald-700 mb-6">
        You are not part of any group yet. Create one now to start pooling funds with other vendors for bulk stock purchases.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="group_name" className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
            Chama Name
          </label>
          <input
            id="group_name"
            type="text"
            required
            placeholder="e.g. Marikiti Section B Traders"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-4 py-3 border border-emerald-200 rounded-xl font-semibold text-emerald-950 focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !groupName.trim()}
          className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-emerald-950 bg-lime-400 hover:bg-lime-500 focus:outline-none transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {loading ? 'Creating Chama...' : 'Create Chama Group'}
        </button>
      </form>
    </div>
  );
};