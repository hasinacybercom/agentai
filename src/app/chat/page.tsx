"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Message = { role: "system" | "user" | "bot"; text: string };
type Conversation = { id: string; title: string; scenario_id?: string | null };
type Group = { key: string; title: string; items: Conversation[] };

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null);

  // New state for scenario editing / tracking
  const [currentScenarioRowId, setCurrentScenarioRowId] = useState<string | null>(null);
  const [isEditingScenario, setIsEditingScenario] = useState(false);
  const [editingScenarioText, setEditingScenarioText] = useState("");

  // New state for admin check
  const [isAdmin, setIsAdmin] = useState(false);

  // Demo mode state
  const [isDemo, setIsDemo] = useState(false);
  const [demoScenarioId, setDemoScenarioId] = useState<string | null>(null);

  // Sidebar grouping state
  const [scenarioTitleMap, setScenarioTitleMap] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Fetch current user and scenario
  useEffect(() => {
    async function initUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = "/auth";
      else {
        setUser(data.user);

        // load role for admin checks
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (profile?.role === "admin") setIsAdmin(true);

        await loadConversations(data.user.id);

        const params = new URLSearchParams(window.location.search);
        const scenarioId = params.get("scenarioId");
        const demoId = params.get("demoScenarioId");

        // demo mode for admins: load scenario content directly from scenarios table
        if (demoId && profile?.role === "admin") {
          await loadScenarioByScenarioId(demoId);
          setIsDemo(true);
          setDemoScenarioId(demoId);
        } else if (scenarioId) {
          await loadScenarioByRowId(scenarioId);
        } else {
          await loadUserScenario(data.user.id);
        }
      }
    }
    initUser();
  }, []);

  // Group conversations by scenario (collapsible)
  const groupedConversations = useMemo<Group[]>(() => {
    const buckets: Record<string, Conversation[]> = {};
    for (const c of conversationsList) {
      const key = c.scenario_id ?? "__none__";
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(c);
    }

    const groups: Group[] = Object.entries(buckets).map(([key, items]) => {
      const isNone = key === "__none__";
      return {
        key,
        title: isNone ? "No scenario" : (scenarioTitleMap[key] ?? "Scenario"),
        items,
      };
    });

    // Sort by scenario title; "No scenario" last
    return groups.sort((a, b) => {
      if (a.key === "__none__") return 1;
      if (b.key === "__none__") return -1;
      return a.title.localeCompare(b.title);
    });
  }, [conversationsList, scenarioTitleMap]);

  // Expand all groups by default when they appear
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const g of groupedConversations) {
        if (next[g.key] === undefined) next[g.key] = true;
      }
      return next;
    });
  }, [groupedConversations]);

  // Load a scenario directly from the scenarios table (used for demo mode)
  async function loadScenarioByScenarioId(scenarioId: string) {
    const { data, error } = await supabase
      .from("scenarios")
      .select("id, title, content")
      .eq("id", scenarioId)
      .single();

    if (error) {
      console.error(error);
      return;
    }
    if (data) {
      // do not set currentScenarioRowId because this is a demo scenario (not assigned)
      setCurrentScenarioRowId(null);
      if (data.content) setSystemPrompt(data.content);
      if (data.title) setScenarioTitle(data.title);
    }
  }

  async function loadScenarioByRowId(rowId: string) {
    const { data, error } = await supabase
      .from("user_scenarios")
      .select(` id, assigned_at, scenarios ( id, title, content ) `)
      .eq("id", rowId)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setCurrentScenarioRowId(data.id ?? null);
      const scenariosObj: any = data.scenarios;
      const content = Array.isArray(scenariosObj) ? scenariosObj[0]?.content : scenariosObj?.content;
      const title = Array.isArray(scenariosObj) ? scenariosObj[0]?.title : scenariosObj?.title;
      if (content) setSystemPrompt(content);
      if (title) setScenarioTitle(title);
    }
  }

  async function loadUserScenario(userId: string) {
    const { data, error } = await supabase
      .from("user_scenarios")
      .select(`
        id,
        assigned_at,
        scenarios ( id, title, content )
      `)
      .eq("user_id", userId)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setCurrentScenarioRowId(data.id ?? null);
      const scenariosObj: any = data.scenarios;
      const content = Array.isArray(scenariosObj) ? scenariosObj[0]?.content : scenariosObj?.content;
      const title = Array.isArray(scenariosObj) ? scenariosObj[0]?.title : scenariosObj?.title;
      if (content) setSystemPrompt(content);
      if (title) setScenarioTitle(title);
    }
  }

  async function loadConversations(userId: string) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const rows = data ?? [];

    // No dedupe — keep all conversations
    const list = rows.map((r) => ({
      id: r.id,
      title: r.title,
      scenario_id: r.scenario_id ?? null,
    }));

    setConversationsList(list);

    // Fetch titles for the scenarios referenced by conversations
    const scenarioIds = Array.from(
      new Set(list.map((c) => c.scenario_id).filter(Boolean))
    ) as string[];

    if (scenarioIds.length) {
      const { data: scenarioRows, error } = await supabase
        .from("user_scenarios")
        .select("id, scenarios ( title )")
        .in("id", scenarioIds);

      if (!error && scenarioRows) {
        const map: Record<string, string> = {};
        for (const row of scenarioRows as any[]) {
          const scenariosObj: any = row.scenarios;
          const title = Array.isArray(scenariosObj)
            ? scenariosObj[0]?.title
            : scenariosObj?.title;
          map[row.id] = title ?? "Untitled scenario";
        }
        setScenarioTitleMap(map);
      }
    } else {
      setScenarioTitleMap({});
    }
  }

  async function selectConversation(convoId: string) {
    const { data: convo } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", convoId)
      .single();
    if (!convo) return;

    setConversation(convo);

    // if conversation is linked to a scenario row, load it
    if (convo.scenario_id) {
      const { data: scenarioRow } = await supabase
        .from("user_scenarios")
        .select(`id, scenarios ( id, title, content )`)
        .eq("id", convo.scenario_id)
        .single();
      if (scenarioRow) {
        setCurrentScenarioRowId(scenarioRow.id ?? null);
        const scenariosObj: any = scenarioRow.scenarios;
        const content = Array.isArray(scenariosObj) ? scenariosObj[0]?.content : scenariosObj?.content;
        const title = Array.isArray(scenariosObj) ? scenariosObj[0]?.title : scenariosObj?.title;
        if (content) setSystemPrompt(content);
        if (title) setScenarioTitle(title);
      }
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });

    setMessages(
      (msgs ?? []).map((m: any) => ({
        role: m.sender === "user" ? "user" : m.sender === "bot" ? "bot" : "system",
        text: m.content,
      }))
    );

    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }

  async function newConversation() {
    const title = `Chat ${new Date().toLocaleString()}`;

    if (isDemo) {
      // Demo conversation: don't persist, use ephemeral convo
      setConversation({ id: `demo-${Date.now()}`, title: `Demo: ${new Date().toLocaleString()}`, scenario_id: demoScenarioId ?? null });
      setMessages([]);
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title, scenario_id: currentScenarioRowId ?? null })
      .select()
      .single();
    if (data) {
      await loadConversations(user.id);
      setConversation(data);
      setMessages([]);
    }

    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }

  async function clearChat() {
    if (!conversation) return;
    await supabase.from("messages").delete().eq("conversation_id", conversation.id);
    setMessages([]);
  }

  async function sendMessage() {
    if (!input.trim() || !user) return;
    if (!conversation) await newConversation();
    const convoId = conversation?.id!;

    // In demo mode we don't persist messages; otherwise insert into DB
    // Show system message locally at start
    if (systemPrompt && messages.length === 0) {
      if (isDemo) {
        const sysMsg: Message = { role: "system", text: systemPrompt };
        setMessages((prev) => [...prev, sysMsg]);
      } else {
        await supabase.from("messages").insert({
          conversation_id: convoId,
          user_id: user.id,
          sender: "system",
          content: systemPrompt,
          status: "sent",
        });
      }
    }

    // Save user message (persist only when not demo)
    if (!isDemo) {
      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: user.id,
        sender: "user",
        content: input,
        status: "sent",
      });
    }

    // Show user message locally
    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");

    try {
      // Call webhook with flat structure
      const res = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemMessage: systemPrompt || "",
          message: userInput,
          user: user.email,
        }),
      });

      const replyText = await res.text();
      const botMessage: Message = { role: "bot", text: replyText || "No reply" };
      setMessages((prev) => [...prev, botMessage]);

      // Persist bot reply only when not demo
      if (!isDemo) {
        await supabase.from("messages").insert({
          conversation_id: convoId,
          user_id: user.id,
          sender: "bot",
          content: replyText,
          status: "sent",
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  // Save or update the current user's scenario row (editing scenario content)
  async function saveEditedScenario() {
    // Only admins may save scenario edits
    if (!user || !isAdmin) return;
    const payload = { scenarios: { content: editingScenarioText } };
    try {
      if (currentScenarioRowId) {
        const { error } = await supabase
          .from("user_scenarios")
          .update(payload)
          .eq("id", currentScenarioRowId);
        if (error) console.error(error);
      } else {
        const { data, error } = await supabase
          .from("user_scenarios")
          .insert({ user_id: user.id, scenarios: { content: editingScenarioText } })
          .select()
          .single();
        if (error) console.error(error);
        if (data?.id) setCurrentScenarioRowId(data.id);
      }
      setSystemPrompt(editingScenarioText);
      setIsEditingScenario(false);
      if (user?.id) await loadConversations(user.id);
    } catch (err) {
      console.error(err);
    }
  }

  // Export chat as PDF
  const exportChatAsPdf = async () => {
    if (!conversation || messages.length === 0) return;
    try {
      const { default: jsPDF } = await import("jspdf");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const titleText = conversation?.title || "Chat";
      const scenario = scenarioTitle ? scenarioTitle : (isDemo ? "Demo" : "No scenario");

      doc.setProperties({
        title: titleText,
        subject: "Chat Export",
        author: user?.email || "Demo AI",
      });

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(20);
      doc.text(titleText, margin, y);
      y += 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Scenario: ${scenario}`, margin, y);
      y += 14;
      doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
      y += 16;

      doc.setDrawColor(220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;

      const addPageIfNeeded = (extra = 0) => {
        if (y + extra > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const printBlock = (label: string, text: string) => {
        const headerSize = 11;
        const bodySize = 12;
        const bodyLineHeight = 16;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(headerSize);
        doc.setTextColor(50);
        addPageIfNeeded(headerSize + 6);
        doc.text(label, margin, y);
        y += headerSize + 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(bodySize);
        doc.setTextColor(20);

        const lines = doc.splitTextToSize(text || "", contentWidth);
        for (const line of lines) {
          addPageIfNeeded(bodyLineHeight);
          doc.text(line, margin, y);
          y += bodyLineHeight;
        }

        y += 8;
      };

      messages.forEach((m) => {
        const label = m.role === "user" ? "You" : m.role === "bot" ? "Bot" : "System";
        printBlock(label, m.text);
      });

      const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").slice(0, 100);
      doc.save(`${safe(titleText)}.pdf`);
    } catch (e) {
      console.error("Failed to export PDF", e);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-gray-800 text-white">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Chat</h1>
        <div className="w-10"></div>
      </div>

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative inset-0 z-10 md:z-auto w-full md:w-80 bg-gray-800 text-white p-4 flex flex-col`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Demo AI</h2>
            {systemPrompt ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-300 truncate max-w-xs mt-1">Scenario: {scenarioTitle}</p>
                {isDemo && <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded mt-1">Demo</span>}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No scenario selected</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Scenarios"
              onClick={() => (window.location.href = "/scenarios")}
              className="p-2 rounded-md hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 rounded-md hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <button
          onClick={newConversation}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-md mb-2 flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          New Chat
        </button>

        {/* Show Edit Scenario button only if admin */}
        {isAdmin && (
          <button
            onClick={() => {
              setIsEditingScenario(true);
              setEditingScenarioText(systemPrompt ?? "");
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-md mb-4 flex items-center justify-center gap-2 transition-colors"
          >
            Edit Scenario
          </button>
        )}

        <div className="flex-1 overflow-y-auto mb-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Chats by scenario</h3>
          <div className="space-y-2">
            {groupedConversations.map((group) => (
              <div key={group.key} className="rounded-md">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  onClick={() =>
                    setExpandedGroups((s) => ({ ...s, [group.key]: !s[group.key] }))
                  }
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 transform transition-transform ${expandedGroups[group.key] ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">{group.title}</span>
                  </div>
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{group.items.length}</span>
                </button>

                {expandedGroups[group.key] && (
                  <ul className="space-y-1 mt-1">
                    {group.items.map((c) => (
                      <li key={c.id}>
                        <button
                          className={`w-full text-left p-3 rounded-md transition-colors ${
                            conversation?.id === c.id
                              ? "bg-indigo-700 text-white"
                              : "text-gray-300 hover:bg-gray-700"
                          }`}
                          onClick={() => selectConversation(c.id)}
                        >
                          <div className="truncate">{c.title}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-md flex items-center justify-center gap-2 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Top bar with back to scenarios when a conversation is open */}
        <div className="hidden md:flex items-center justify-between p-3 bg-white border-b">
          <div className="flex items-center gap-3">
            <button onClick={() => (window.location.href = "/scenarios")} className="text-indigo-600 hover:underline">
              ← Back to scenarios
            </button>
            {scenarioTitle && <div className="text-sm text-gray-600 truncate max-w-xl">Current scenario: {scenarioTitle}{isDemo ? " (Demo — not saved)" : ""}</div>}
          </div>
          <div>
            {/* Show edit link only to admins */}
            {isAdmin && (
              <button onClick={() => { setIsEditingScenario(true); setEditingScenarioText(systemPrompt ?? ""); }} className="text-sm text-indigo-600 hover:underline">
                Edit scenario
              </button>
            )}
          </div>
        </div>

        {conversation ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-4 ${
                          m.role === "user" 
                            ? "bg-indigo-600 text-white rounded-br-none" 
                            : "bg-gray-100 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {m.role === "bot" && (
                            <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="whitespace-pre-wrap break-words">{m.text}</p>
                          </div>
                          {m.role === "user" && (
                            <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t">
              <div className="max-w-3xl mx-auto flex space-x-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border text-black rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
                  </svg>
                </button>
                <button
                  onClick={clearChat}
                  className="bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
                <button
                  onClick={exportChatAsPdf}
                  disabled={!conversation || messages.length === 0}
                  className="bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Export chat to PDF"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"></path>
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Chat</h2>
              <p className="text-gray-600 mb-6">Start a new conversation or select an existing one from the sidebar</p>
              <button
                onClick={newConversation}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start Chatting
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Scenario modal - render only for admins */}
      {isEditingScenario && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg max-w-xl w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Edit current scenario</h3>
            <textarea
              value={editingScenarioText}
              onChange={(e) => setEditingScenarioText(e.target.value)}
              className="w-full h-48 border p-3 rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditingScenario(false)} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={saveEditedScenario} className="px-4 py-2 rounded bg-indigo-600 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
