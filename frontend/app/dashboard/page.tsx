"use client";
import { useEffect, useState } from 'react';

// 1. Fix the 'any' error by defining exactly what the backend returns
interface PoolData {
  pool_id?: number;
  group_name?: string;
  target_amount?: number;
  collected?: number;
  remaining?: number;
  status?: string;
  deadline?: string;
  error?: string; // For handling our custom error states
}

export default function Dashboard() {
  // Pass the interface to useState
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2. Fix the cascading render error by wrapping logic in an async function
    const fetchActivePool = async () => {
      const token = localStorage.getItem('access_token'); 
      
      if (!token) {
        // Now this is safely contained within a function call
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

    // Execute the async function
    fetchActivePool();
  }, []);

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

        <button className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow hover:bg-green-700 transition">
          Contribute Now (M-Pesa)
        </button>
      </div>
    </div>
  );
}