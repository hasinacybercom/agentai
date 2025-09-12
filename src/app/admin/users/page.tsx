"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadScenarios();
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", "user");
    setUsers(data ?? []);
  }

  async function loadScenarios() {
    const { data } = await supabase.from("scenarios").select("*");
    setScenarios(data ?? []);
  }

  async function assignScenario() {
    if (!selectedUser || !selectedScenario) return;

    await supabase.from("user_scenarios").insert({
      user_id: selectedUser,
      scenario_id: selectedScenario,
    });

    alert("Scenario assigned!");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Assign Scenarios to Users</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Users Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl text-black font-bold mb-4">Users</h2>
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u.id)}
                className={`cursor-pointer p-3 rounded-lg shadow transition
                  ${selectedUser === u.id ? "bg-purple-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"}
                `}
              >
                {u.full_name || u.id}
              </div>
            ))}
          </div>
        </div>

        {/* Scenarios Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl text-black font-bold mb-4">Scenarios</h2>
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedScenario(s.id)}
                className={`cursor-pointer p-3 rounded-lg shadow transition
                  ${selectedScenario === s.id ? "bg-green-600 text-white" : "bg-gray-100 text-black hover:bg-gray-200"}
                `}
              >
                {s.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={assignScenario}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Assign Scenario
        </button>
      </div>
    </div>
  );
}
