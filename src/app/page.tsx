"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  // Function to redirect based on role
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

  if (!session) {
    // Show Supabase Auth UI
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
        />
      </main>
    );
  }

  // Optional fallback if session exists but role redirection didn't trigger
  return (
    <main className="flex min-h-screen items-center justify-center flex-col">
      <h1 className="text-2xl font-bold">Welcome, {session.user.email}</h1>
      <a
        href="/chat"
        className="mt-4 rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
      >
        Go to Chat
      </a>
    </main>
  );
}
