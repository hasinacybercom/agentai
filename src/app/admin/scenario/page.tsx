"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ScenarioPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function handleCreateScenario() {
    if (!title || !content) {
      alert("Please fill all fields");
      return;
    }

    await supabase.from("scenarios").insert({
      title,
      content,
    });

    alert("Scenario created!");
    setTitle("");
    setContent("");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Create New Scenario</h1>

      <div className="max-w-2xl bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <input
          type="text"
          placeholder="Scenario Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border text-black p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <textarea
          placeholder="Scenario Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border text-black p-3 rounded-lg h-48 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        <button
          onClick={handleCreateScenario}
          className="bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 transition"
        >
          Create Scenario
        </button>
      </div>
    </div>
  );
}
