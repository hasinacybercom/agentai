"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const { data: m } = await supabase
        .from("conversation_metrics")
        .select("*, user_id");
      setMetrics(m || []);

      const { data: f } = await supabase
        .from("feedback")
        .select("*, user_id");
      setFeedback(f || []);
    }

    loadData();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      {/* Conversation Stats */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Conversations</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-white shadow rounded">
            <p className="text-gray-500">Total Conversations</p>
            <p className="text-2xl font-bold">{metrics.length}</p>
          </div>
          <div className="p-4 bg-white shadow rounded">
            <p className="text-gray-500">Avg Messages per Chat</p>
            <p className="text-2xl font-bold">
              {metrics.length
                ? (
                    metrics.reduce((a, m) => a + m.total_messages, 0) /
                    metrics.length
                  ).toFixed(1)
                : 0}
            </p>
          </div>
          <div className="p-4 bg-white shadow rounded">
            <p className="text-gray-500">Avg User Msgs</p>
            <p className="text-2xl font-bold">
              {metrics.length
                ? (
                    metrics.reduce((a, m) => a + m.user_messages, 0) /
                    metrics.length
                  ).toFixed(1)
                : 0}
            </p>
          </div>
        </div>
      </section>

      {/* Feedback */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Feedback</h2>
        <div className="bg-white shadow rounded p-4">
          {feedback.length === 0 ? (
            <p className="text-gray-500">No feedback yet</p>
          ) : (
            <ul className="space-y-3">
              {feedback.map((f) => (
                <li key={f.id} className="border-b pb-2">
                  <p>
                    <span className="font-semibold">Rating:</span> {f.rating}/5
                  </p>
                  {f.comment && (
                    <p className="text-gray-600 italic">"{f.comment}"</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
