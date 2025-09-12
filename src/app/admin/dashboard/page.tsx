"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth"); // redirect to login
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-extrabold drop-shadow-lg">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg shadow hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Manage Users */}
          <div
            onClick={() => router.push("/admin/users")}
            className="cursor-pointer bg-white text-gray-800 rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transform transition"
          >
            <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
            <p>View all users and assign scenarios</p>
          </div>

          {/* Upload Scenario */}
          <div
            onClick={() => router.push("/admin/scenario")}
            className="cursor-pointer bg-white text-gray-800 rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transform transition"
          >
            <h2 className="text-2xl font-bold mb-4">Upload Scenario</h2>
            <p>Create scenario templates for AI chat interactions</p>
          </div>

          {/* Optional: Analytics / Stats */}
          <div className="bg-white text-gray-800 rounded-2xl shadow-lg p-8 flex flex-col justify-between hover:scale-105 transform transition">
            <h2 className="text-2xl font-bold mb-4">Statistics</h2>
            <p>Coming soon: chat activity & scenario usage stats</p>
          </div>
        </div>
      </div>
    </div>
  );
}
