"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
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
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="w-full max-w-md p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="dark"
            providers={[]}
          />
        </div>
      </main>
    );
  }

  // When authenticated we show a minimal redirecting state while redirectByRole runs
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-pulse text-gray-600">Redirecting...</div>
      </div>
    </main>
  );
}
