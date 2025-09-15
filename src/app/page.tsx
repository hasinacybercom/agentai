"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);

      if (data.session) {
        redirectByRole(data.session.user.id);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) redirectByRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function redirectByRole(userId: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile) return;

    if (profile.role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/chat");
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (session) {
    // When authenticated we show a minimal redirecting state while redirectByRole runs
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-pulse text-gray-600">Redirecting...</div>
        </div>
      </main>
    );
  }

  // Unauthenticated: simple landing page with login CTA
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-8">
      <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-8">
        <section className="flex-1">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">My Chatbot</h1>
          <p className="text-gray-600 mb-6">
            A small, focused interface for guided AI conversations. Log in to access your scenarios,
            chat with the assistant, or manage templates.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-full shadow hover:bg-indigo-700 transition"
            >
              Log in
            </button>

            <button
              onClick={() => router.push("/chat")}
              className="px-4 py-3 bg-white border rounded-lg text-sm hover:shadow-sm"
            >
              Try chat
            </button>
          </div>
        </section>

        <aside className="w-full md:w-80 bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Features</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Assignable scenario templates</li>
            <li>• Role-based admin area</li>
            <li>• Persistent user sessions</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
