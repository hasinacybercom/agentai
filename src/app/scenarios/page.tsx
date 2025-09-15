"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Scenario = { rowId: string; scenarioId: string; title: string; content: string; assigned_at: string };

export default function ScenariosPage() {
  const [user, setUser] = useState<any>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }
      setUser(data.user);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (profile?.role === "admin") setIsAdmin(true);

      await loadScenarios(data.user.id);
      setLoading(false);
    }
    init();
  }, []);

  async function loadScenarios(userId: string) {
    const { data, error } = await supabase
      .from("user_scenarios")
      .select(`
        id,
        assigned_at,
        scenarios ( id, title, content )
      `)
      .eq("user_id", userId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error(error);
      setScenarios([]);
      return;
    }

    const map = new Map<string, any>();
    for (const row of data ?? []) {
      const nested = (row as any).scenarios ?? {};
      const scenId = nested?.id ?? `row:${row.id}`;
      if (!map.has(scenId)) {
        map.set(scenId, { rowId: row.id, scenarioId: nested?.id ?? "", title: nested?.title ?? "Scenario", content: nested?.content ?? "", assigned_at: row.assigned_at });
      }
    }

    setScenarios(Array.from(map.values()));
  }

  function openChatWithScenario(scenarioRowId: string) {
    router.push(`/chat?scenarioId=${scenarioRowId}`);
  }

  async function startEditing(rowId: string, currentContent: string) {
    if (!isAdmin) return;
    setEditingRowId(rowId);
    setEditingText(currentContent);
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!editingRowId) return;
    if (!isAdmin) return;
    const { error } = await supabase
      .from("user_scenarios")
      .update({ scenarios: { content: editingText } })
      .eq("id", editingRowId);
    if (error) {
      console.error(error);
      return;
    }
    setIsEditing(false);
    setEditingRowId(null);
    setEditingText("");
    if (user?.id) await loadScenarios(user.id);
  }

  const filtered = scenarios.filter(s => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <main className="flex min-h-screen items-start justify-center p-6 bg-gray-50">
      <div className="max-w-5xl w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Choose a scenario</h1>
            <p className="text-sm text-gray-500 mt-1">Select a scenario to start a guided conversation.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scenarios..."
              className="px-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => router.push("/chat")} className="text-sm text-indigo-600 hover:underline">Go to chat</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="text-gray-600">No scenarios assigned to your account.</div>
          ) : (
            filtered.map(s => (
              <div key={s.rowId} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{s.title}</div>
                    <div className="text-sm text-gray-500 mt-2 line-clamp-4">{s.content}</div>
                    <div className="text-xs text-gray-400 mt-3">Assigned: {new Date(s.assigned_at).toLocaleString()}</div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => openChatWithScenario(s.rowId)} className="bg-indigo-600 text-white px-4 py-2 rounded-md">Open</button>

                    {/* only admins see edit */}
                    {isAdmin && (
                      <button onClick={() => startEditing(s.rowId, s.content)} className="text-sm text-gray-600 hover:underline">Edit</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit modal (admin only) */}
      {isEditing && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Edit scenario</h3>
            <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="w-full h-48 border p-3 rounded mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

