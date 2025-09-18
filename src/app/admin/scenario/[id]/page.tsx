"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "@/components/admin/AdminSidebar";

type Profile = { id: string; full_name?: string | null; role?: string | null };

type ConversationWithMessages = {
  id: string;
  title: string;
  created_at: string;
  scenario_id: string;
  messages: {
    id: string;
    role: string;
    text: string;
    created_at: string;
  }[];
};

export default function ScenarioUsersPage() {
  const params = useParams();
  const scenarioId = params?.id as string | undefined;

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [convsError, setConvsError] = useState<string | null>(null);

  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);

  // Load users for this scenario
  useEffect(() => {
    if (!scenarioId) return;

    const loadUsers = async () => {
      setLoadingUsers(true);
      setUsersError(null);

      try {
        const { data: userScenarios, error: usError } = await supabase
          .from("user_scenarios")
          .select("user_id")
          .eq("scenario_id", scenarioId);

        if (usError) throw usError;

        const userIds = [...new Set((userScenarios ?? []).map((r) => r.user_id))];
        if (userIds.length === 0) {
          setUsers([]);
          setLoadingUsers(false);
          return;
        }

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        setUsers(profiles ?? []);
      } catch (err: any) {
        console.error("Error loading users:", err);
        setUsersError(err?.message ?? JSON.stringify(err));
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [scenarioId]);

  // Load conversations for selected user
  async function loadConversationsForUser(userId: string) {
    setSelectedUserId(userId);
    setLoadingConvs(true);
    setConvsError(null);
    setConversations([]);
    setExpandedConvId(null);

    try {
      const { data, error } = await supabase.rpc("get_user_conversations", {
        p_user_id: userId,
        p_scenario_id: scenarioId,
      });
      console.log("Fetched conversations for user", userId, "and scenario", scenarioId);
      console.log("RPC data:", data, "error:", error);

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        return;
      }

      // group rows by conversation_id
      const convMap: Record<string, ConversationWithMessages> = {};
      data.forEach((row: any) => {
        if (!convMap[row.conversation_id]) {
          convMap[row.conversation_id] = {
            id: row.conversation_id,
            title:
              row.conversation_title ??
              `Chat • ${new Date(row.conversation_created_at).toLocaleString()}`,
            created_at: row.conversation_created_at,
            scenario_id: row.scenario_id,
            messages: [],
          };
        }

        if (row.message_id) {
          convMap[row.conversation_id].messages.push({
            id: row.message_id,
            role: row.sender,
            text: row.content,
            created_at: row.message_created_at,
          });
        }
      });

      const convs = Object.values(convMap).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Sort messages within each conversation by created_at
      convs.forEach(conv => {
        conv.messages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      setConversations(convs);
    } catch (err: any) {
      console.error("Error loading conversations:", err);
      setConvsError(err?.message ?? JSON.stringify(err));
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }

  function toggleConversation(convId: string) {
    setExpandedConvId((prev) => (prev === convId ? null : convId));
  }

  function exportConversationCSV(conv: ConversationWithMessages) {
    const rows = [["role", "text", "created_at"]];
    conv.messages.forEach((m) =>
      rows.push([
        m.role,
        (m.text || "").replace(/\r?\n/g, " "),
        m.created_at || "",
      ])
    );
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conv.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Chat Message Component
  function ChatMessage({ message }: { message: { id: string; role: string; text: string; created_at: string } }) {
    const isUser = message.role === "user";
    
    return (
      <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
        <div className={`flex max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? "ml-3" : "mr-3"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isUser 
                ? "bg-blue-500 text-white" 
                : "bg-gray-400 text-white"
            }`}>
              {isUser ? "U" : "B"}
            </div>
          </div>
          
          {/* Message Bubble */}
          <div className="flex flex-col">
            <div className={`rounded-2xl px-4 py-2 max-w-md ${
              isUser
                ? "bg-blue-500 text-white rounded-br-md"
                : "bg-gray-200 text-gray-800 rounded-bl-md"
            }`}>
              <div className="text-sm whitespace-pre-wrap break-words">
                {message.text}
              </div>
            </div>
            
            {/* Timestamp */}
            <div className={`text-xs text-gray-500 mt-1 ${isUser ? "text-right" : "text-left"}`}>
              {message.created_at
                ? new Date(message.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start">
        <AdminSidebar active="scenarios" />

        <main className="space-y-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold">
                Scenario users & chat history
              </h1>
              <p className="text-sm text-gray-500">
                Scenario id: <span className="font-mono">{scenarioId}</span>
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-[260px_1fr] gap-6">
            {/* Left: users */}
            <aside className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-3">Assigned users</h2>

              {loadingUsers ? (
                <div className="text-sm text-gray-500">Loading users…</div>
              ) : usersError ? (
                <div className="text-sm text-red-600">Error: {usersError}</div>
              ) : users.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No users assigned to this scenario.
                </div>
              ) : (
                <ul className="space-y-2">
                  {users.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => loadConversationsForUser(u.id)}
                        className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${
                          selectedUserId === u.id
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <span className="truncate">{u.full_name ?? u.id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* Right: conversations */}
            <section className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {selectedUserId
                    ? `Conversations for ${
                        users.find((x) => x.id === selectedUserId)?.full_name ??
                        selectedUserId
                      }`
                    : "Select a user to view chats"}
                </h2>
                <div className="text-sm text-gray-400">
                  {loadingConvs
                    ? "Loading…"
                    : convsError
                    ? "Error"
                    : `${conversations.length} conversations`}
                </div>
              </div>

              {convsError && (
                <div className="text-sm text-red-600 mb-2">Error: {convsError}</div>
              )}

              {!selectedUserId && (
                <div className="text-sm text-gray-500">
                  Pick a user on the left to load chat history.
                </div>
              )}

              {selectedUserId && loadingConvs && (
                <div className="text-sm text-gray-500">
                  Loading conversations…
                </div>
              )}

              {selectedUserId &&
                !loadingConvs &&
                conversations.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No conversations found for this user + scenario.
                  </div>
                )}

              <div className="space-y-4">
                {conversations.map((conv) => (
                  <div key={conv.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{conv.title}</div>
                        <div className="text-xs text-gray-400">
                          {conv.created_at
                            ? new Date(conv.created_at).toLocaleString()
                            : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleConversation(conv.id)}
                          className="px-3 py-1 rounded bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100 transition-colors"
                        >
                          {expandedConvId === conv.id ? "Hide" : "Open"}
                        </button>
                        <button
                          onClick={() => exportConversationCSV(conv)}
                          className="px-3 py-1 rounded border text-sm hover:bg-gray-50 transition-colors"
                        >
                          Export CSV
                        </button>
                      </div>
                    </div>

                    {expandedConvId === conv.id && (
                      <div className="bg-white">
                        {conv.messages.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            No messages in this conversation.
                          </div>
                        ) : (
                          <div className="p-4 max-h-96 overflow-y-auto bg-gray-50">
                            <div className="space-y-1">
                              {conv.messages.map((message) => (
                                <ChatMessage key={message.id} message={message} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}