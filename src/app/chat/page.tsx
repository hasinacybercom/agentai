// "use client";

// import { useEffect, useState } from "react";
// import { supabase } from "@/lib/supabaseClient";

// type Message = { role: "system" | "user" | "bot"; text: string };
// type Conversation = { id: string; title: string };

// export default function ChatPage() {
//   const [user, setUser] = useState<any>(null);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState("");
//   const [conversation, setConversation] = useState<Conversation | null>(null);
//   const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//   const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

//   // Fetch current user and scenario
//   useEffect(() => {
//     async function initUser() {
//       const { data } = await supabase.auth.getUser();
//       if (!data.user) window.location.href = "/auth";
//       else {
//         setUser(data.user);
//         loadConversations(data.user.id);
//         loadUserScenario(data.user.id);
//       }
//     }
//     initUser();
//   }, []);

//   async function loadUserScenario(userId: string) {
//     // Fetch most recent scenario assigned to the user
//     const { data } = await supabase
//       .from("user_scenarios")
//       .select("scenario(title, content)")
//       .eq("user_id", userId)
//       .order("assigned_at", { ascending: false })
//       .limit(1)
//       .single();
//       console.log('data',data);
//       if (data?.scenario && data.scenario.length > 0) {
//         setSystemPrompt(data.scenario[0].content);
//       }

//   }

//   async function loadConversations(userId: string) {
//     const { data } = await supabase
//       .from("conversations")
//       .select("*")
//       .eq("user_id", userId)
//       .order("created_at", { ascending: false });
//     setConversationsList(data ?? []);
//   }

//   // Select a conversation and load messages
//   async function selectConversation(convoId: string) {
//     const { data: convo } = await supabase
//       .from("conversations")
//       .select("*")
//       .eq("id", convoId)
//       .single();
//     if (!convo) return;

//     setConversation(convo);

//     const { data: msgs } = await supabase
//       .from("messages")
//       .select("*")
//       .eq("conversation_id", convoId)
//       .order("created_at", { ascending: true });

//     setMessages(
//       (msgs ?? []).map((m: any) => ({
//         role: m.sender === "user" ? "user" : m.sender === "bot" ? "bot" : "system",
//         text: m.content,
//       }))
//     );

//     if (window.innerWidth < 768) setIsSidebarOpen(false);
//   }

//   async function newConversation() {
//     const title = `Chat ${new Date().toLocaleString()}`;
//     const { data } = await supabase
//       .from("conversations")
//       .insert({ user_id: user.id, title })
//       .select()
//       .single();
//     if (data) {
//       await loadConversations(user.id);
//       setConversation(data);
//       setMessages([]);
//     }
//     if (window.innerWidth < 768) setIsSidebarOpen(false);
//   }

//   async function clearChat() {
//     if (!conversation) return;
//     await supabase.from("messages").delete().eq("conversation_id", conversation.id);
//     setMessages([]);
//   }

//   async function sendMessage() {
//     if (!input.trim() || !user) return;
//     if (!conversation) await newConversation();
//     const convoId = conversation?.id!;

//     // Build messages to send with system prompt
//     const messagesToSend: Message[] = [];
//     if (systemPrompt && messages.length === 0) {
//       // Only add system message at the start of conversation
//       messagesToSend.push({ role: "system", text: systemPrompt });
//       // Save system message to DB
//       await supabase.from("messages").insert({
//         conversation_id: convoId,
//         user_id: user.id,
//         sender: "system",
//         content: systemPrompt,
//         status: "sent",
//       });
//     }

//     messagesToSend.push({ role: "user", text: input });

//     // Show user message immediately
//     const userMessage: Message = { role: "user", text: input };
//     setMessages((prev) => [...prev, userMessage]);
//     setInput("");

//     // Save user message
//     await supabase.from("messages").insert({
//       conversation_id: convoId,
//       user_id: user.id,
//       sender: "user",
//       content: input,
//       status: "sent",
//     });

//     try {
//       const res = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ messages: messagesToSend, user: user.email }),
//       });

//       const replyText = await res.text();
//       const botMessage: Message = { role: "bot", text: replyText || "No reply" };
//       setMessages((prev) => [...prev, botMessage]);

//       // Save bot message
//       await supabase.from("messages").insert({
//         conversation_id: convoId,
//         user_id: user.id,
//         sender: "bot",
//         content: replyText,
//         status: "sent",
//       });
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   async function handleLogout() {
//     await supabase.auth.signOut();
//     window.location.href = "/auth";
//   }

//     return (
//     <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
//       {/* Mobile header */}
//       <div className="md:hidden flex items-center justify-between p-4 bg-gray-800 text-white">
//         <button 
//           onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//           className="p-2 rounded-md focus:outline-none"
//         >
//           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
//           </svg>
//         </button>
//         <h1 className="text-xl font-semibold">Chat</h1>
//         <div className="w-10"></div> {/* Spacer for balance */}
//       </div>

//       {/* Sidebar */}
//       <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative inset-0 z-10 md:z-auto w-full md:w-80 bg-gray-800 text-white p-4 flex flex-col`}>
//         <div className="flex items-center justify-between mb-6">
//           <h2 className="text-xl font-bold">Demo AI</h2>
//           <button 
//             onClick={() => setIsSidebarOpen(false)}
//             className="md:hidden p-1 rounded-md hover:bg-gray-700"
//           >
//             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
//             </svg>
//           </button>
//         </div>
        
//         <button
//           onClick={newConversation}
//           className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-md mb-4 flex items-center justify-center gap-2 transition-colors"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
//           </svg>
//           New Chat
//         </button>
        
//         <div className="flex-1 overflow-y-auto mb-4">
//           <h3 className="text-sm font-medium text-gray-400 mb-2">Recent chats</h3>
//           <ul className="space-y-1">
//             {conversationsList.map((c) => (
//               <li key={c.id}>
//                 <button
//                   className={`w-full text-left p-3 rounded-md transition-colors ${
//                     conversation?.id === c.id 
//                       ? "bg-indigo-700 text-white" 
//                       : "text-gray-300 hover:bg-gray-700"
//                   }`}
//                   onClick={() => selectConversation(c.id)}
//                 >
//                   <div className="truncate">{c.title}</div>
//                 </button>
//               </li>
//             ))}
//           </ul>
//         </div>
        
//         <div className="pt-4 border-t border-gray-700">
//           <button
//             onClick={handleLogout}
//             className="w-full bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-md flex items-center justify-center gap-2 transition-colors"
//           >
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
//             </svg>
//             Logout
//           </button>
//         </div>
//       </div>

//       {/* Overlay for mobile sidebar */}
//       {isSidebarOpen && (
//         <div 
//           className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
//           onClick={() => setIsSidebarOpen(false)}
//         ></div>
//       )}

//       {/* Chat area */}
//       <div className="flex-1 flex flex-col h-screen">
//         {conversation ? (
//           <>
//             <div className="flex-1 overflow-y-auto p-4 bg-white">
//               <div className="max-w-3xl mx-auto space-y-4">
//                 {messages.length === 0 ? (
//                   <div className="text-center py-12 text-gray-500">
//                     <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
//                     </svg>
//                     <p>No messages yet. Start a conversation!</p>
//                   </div>
//                 ) : (
//                   messages.map((m, i) => (
//                     <div
//                       key={i}
//                       className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
//                     >
//                       <div
//                         className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-4 ${
//                           m.role === "user" 
//                             ? "bg-indigo-600 text-white rounded-br-none" 
//                             : "bg-gray-100 text-gray-800 rounded-bl-none"
//                         }`}
//                       >
//                         <div className="flex items-start gap-2">
//                           {m.role === "bot" && (
//                             <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
//                               <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
//                               </svg>
//                             </div>
//                           )}
//                           <div className="min-w-0">
//                             <p className="whitespace-pre-wrap break-words">{m.text}</p>
//                           </div>
//                           {m.role === "user" && (
//                             <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0">
//                               <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
//                               </svg>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>

//             <div className="p-4 bg-white border-t">
//               <div className="max-w-3xl mx-auto flex space-x-2">
//                 <input
//                   value={input}
//                   onChange={(e) => setInput(e.target.value)}
//                   placeholder="Type a message..."
//                   className="flex-1 p-3 border text-black rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
//                   onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//                 />
//                 <button
//                   onClick={sendMessage}
//                   disabled={!input.trim()}
//                   className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                 >
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
//                   </svg>
//                 </button>
//                 <button
//                   onClick={clearChat}
//                   className="bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition-colors"
//                 >
//                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
//                   </svg>
//                 </button>
//               </div>
//             </div>
//           </>
//         ) : (
//           <div className="flex-1 flex flex-col items-center justify-center p-4 bg-white">
//             <div className="text-center max-w-md">
//               <svg className="w-16 h-16 mx-auto mb-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
//               </svg>
//               <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Chat</h2>
//               <p className="text-gray-600 mb-6">Start a new conversation or select an existing one from the sidebar</p>
//               <button
//                 onClick={newConversation}
//                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
//               >
//                 Start Chatting
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Message = { role: "system" | "user" | "bot"; text: string };
type Conversation = { id: string; title: string };

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

  // Fetch current user and scenario
  useEffect(() => {
    async function initUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = "/auth";
      else {
        setUser(data.user);
        loadConversations(data.user.id);
        loadUserScenario(data.user.id);
      }
    }
    initUser();
  }, []);

  async function loadUserScenario(userId: string) {
    const { data, error } = await supabase
      .from("user_scenarios")
      .select(`
        id,
        assigned_at,
        scenarios ( content )
      `)
      .eq("user_id", userId)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .single();
  
    console.log("data", data, "error", error);

    if (data?.scenarios) {
        setSystemPrompt(data.scenarios.content);
    }
  }
  

  async function loadConversations(userId: string) {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setConversationsList(data ?? []);
  }

  async function selectConversation(convoId: string) {
    const { data: convo } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", convoId)
      .single();
    if (!convo) return;

    setConversation(convo);

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
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
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

    // Save system message at the start of the conversation
    if (systemPrompt && messages.length === 0) {
      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: user.id,
        sender: "system",
        content: systemPrompt,
        status: "sent",
      });
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: convoId,
      user_id: user.id,
      sender: "user",
      content: input,
      status: "sent",
    });

    // Show user message
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

      // Save bot reply
      await supabase.from("messages").insert({
        conversation_id: convoId,
        user_id: user.id,
        sender: "bot",
        content: replyText,
        status: "sent",
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

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
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block fixed md:relative inset-0 z-10 md:z-auto w-full md:w-80 bg-gray-800 text-white p-4 flex flex-col`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Demo AI</h2>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 rounded-md hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <button
          onClick={newConversation}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-md mb-4 flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          New Chat
        </button>
        
        <div className="flex-1 overflow-y-auto mb-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Recent chats</h3>
          <ul className="space-y-1">
            {conversationsList.map((c) => (
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
        </div>
        
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-md flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
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
    </div>
  );
}
