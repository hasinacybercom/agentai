"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminDashboard() {
  const router = useRouter();

  // Logout function
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth"); // redirect to login
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Sidebar */}
        <AdminSidebar active="dashboard" />

        {/* Main */}
        <main className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-extrabold">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage users, scenarios and monitor activity.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Manage Users */}
            <div
              onClick={() => router.push("/admin/users")}
              className="cursor-pointer bg-white rounded-2xl shadow hover:shadow-lg p-6 flex flex-col justify-between transition transform hover:-translate-y-1"
            >
              <div>
                <h2 className="text-xl font-bold mb-2">Manage Users</h2>
                <p className="text-sm text-gray-600">
                  View users and assign scenario templates to accounts.
                </p>
              </div>
              <div className="mt-6 text-sm text-gray-500">
                Users & assignments
              </div>
            </div>

            {/* Manage Scenarios */}
            <div
              onClick={() => router.push("/admin/scenario")}
              className="cursor-pointer bg-white rounded-2xl shadow hover:shadow-lg p-6 flex flex-col justify-between transition transform hover:-translate-y-1"
            >
              <div>
                <h2 className="text-xl font-bold mb-2">Manage Scenarios</h2>
                <p className="text-sm text-gray-600">
                  Create, edit and remove scenario templates used across the app.
                </p>
              </div>
              <div className="mt-6 text-sm text-gray-500">Scenarios CRUD</div>
            </div>

            {/* Analytics (optional) */}
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col justify-between transition">
              <div>
                <h2 className="text-xl font-bold mb-2">Analytics</h2>
                <p className="text-sm text-gray-600">
                  Usage stats and scenario performance — coming soon.
                </p>
              </div>
              <div className="mt-6 text-sm text-gray-500">Reports & insights</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
