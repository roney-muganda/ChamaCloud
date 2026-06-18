import { useState } from 'react';
import { useRouter } from 'next/router';

export default function WholesalerRegistration() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    business_name: '',
    business_location: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('https://chamacloud-api.onrender.com/api/accounts/wholesaler/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure they are logged in via OTP first
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        // Optionally redirect them to a "Pending Approval" holding page after a few seconds
        setTimeout(() => router.push('/wholesaler/dashboard'), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit application.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Partner with Chama Cloud
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Register your wholesale business to start accepting digital vouchers.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {message && (
            <div className={`mb-4 p-4 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                Registered Business Name
              </label>
              <div className="mt-1">
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  required
                  placeholder="e.g., Marikiti Fresh Produce Ltd."
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="business_location" className="block text-sm font-medium text-gray-700">
                Primary Trading Location / Stall
              </label>
              <div className="mt-1">
                <input
                  id="business_location"
                  name="business_location"
                  type="text"
                  required
                  placeholder="e.g., Muthurwa Market, Section B, Stall 42"
                  value={formData.business_location}
                  onChange={(e) => setFormData({ ...formData, business_location: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || message?.type === 'success'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? 'Submitting Application...' : 'Submit for Verification'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}