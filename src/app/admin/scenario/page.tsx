"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

type ScenarioRow = { id: string; title: string; content: string; created_at?: string };

export default function ScenarioPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Create / Edit form state
  const [editing, setEditing] = useState<ScenarioRow | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/auth";
        return;
      }

      // load role for admin checks (client-side)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profile?.role === "admin") setIsAdmin(true);

      await loadScenarios();
      setLoading(false);
    }
    init();
  }, []);

  async function loadScenarios() {
    const { data, error } = await supabase
      .from("scenarios")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setScenarios([]);
      return;
    }
    setScenarios(data ?? []);
  }

  function startCreate() {
    setEditing(null);
    setTitle("");
    setContent("");
  }

  function startEdit(row: ScenarioRow) {
    setEditing(row);
    setTitle(row.title);
    setContent(row.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveScenario() {
    if (!isAdmin) {
      alert("Only admins can modify scenarios.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("Please fill both title and content.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("scenarios")
          .update({ title: title.trim(), content: content.trim() })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scenarios")
          .insert({ title: title.trim(), content: content.trim() });
        if (error) throw error;
      }
      await loadScenarios();
      startCreate();
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: string) {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }

  async function doDelete() {
    if (!isAdmin || !deletingId) {
      setShowDeleteConfirm(false);
      return;
    }
    try {
      const { error } = await supabase
        .from("scenarios")
        .delete()
        .eq("id", deletingId);
      if (error) throw error;
      // Also remove any user_scenarios pointing to this scenario
      await supabase.from("user_scenarios").delete().eq("scenario_id", deletingId);
      await loadScenarios();
      setShowDeleteConfirm(false);
      setDeletingId(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Delete failed");
    }
  }

  const filtered = scenarios.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q)
    );
  });

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 items-start">
        {/* Sidebar */}
        <AdminSidebar active="scenarios" />

        {/* Main content */}
        <div className="space-y-8">
          {/* Top actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Scenarios
              </h1>
              <p className="text-sm text-gray-500">
                Templates used to guide AI conversations for users.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search scenarios..."
                className="px-3 py-2 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                onClick={() => {
                  startCreate();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 transition"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                New Scenario
              </button>
            </div>
          </div>

          {/* Layout: left list + right form */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* Left: list */}
            <section className="bg-white rounded-2xl shadow p-6">
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {filtered.length === 0 ? (
                  <div className="text-gray-500">No scenarios found.</div>
                ) : (
                  filtered.map((s) => (
                    <article
                      key={s.id}
                      className="border rounded-lg p-4 hover:shadow-md transition transform hover:-translate-y-0.5 flex justify-between gap-4"
                    >
                      <div>
                        <div className="text-lg font-semibold text-gray-800">
                          {s.title}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                          {s.content}
                        </p>
                        <div className="text-xs text-gray-400 mt-2">
                          {s.created_at
                            ? new Date(s.created_at).toLocaleString()
                            : ""}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-indigo-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              router.push(`/chat?demoScenarioId=${s.id}`)
                            }
                            className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm shadow-sm hover:bg-indigo-700"
                          >
                            Demo
                          </button>
                          <button
                            onClick={() => router.push(`scenario/${s.id}`)}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm shadow-sm hover:bg-gray-200"
                          >
                            Users
                          </button>

                          <button
                            onClick={() => confirmDelete(s.id)}
                            className="bg-red-50 text-red-600 px-3 py-1 rounded-md text-sm border border-red-100 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            {/* Right: create / edit panel */}
            <aside className="bg-white rounded-2xl shadow p-6 sticky top-24 self-start">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editing ? "Edit scenario" : "Create scenario"}
                </h2>
                <div className="text-sm text-gray-500">
                  {isAdmin ? "Admin" : "Viewer"}
                </div>
              </div>

              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full p-3 text-black border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Scenario content — the system prompt or instructions"
                  className="w-full p-3 h-48 text-black border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-gray-500">
                    Tip: include clear instructions and examples.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        startCreate();
                      }}
                      className="px-4 py-2 rounded border text-sm"
                    >
                      Reset
                    </button>
                    <button
                      onClick={saveScenario}
                      disabled={!isAdmin || saving}
                      className={`px-4 py-2 rounded text-white text-sm ${
                        isAdmin
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {saving ? "Saving..." : editing ? "Update" : "Create"}
                    </button>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="text-xs text-yellow-600">
                    You are not an admin — create/edit/delete actions are
                    restricted.
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Delete scenario?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will delete the scenario and unlink it from any users. This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                className="px-4 py-2 rounded bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
