import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server key, never client
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { conversationId, content, userId } = req.body;

    // Insert user message
    const { data: message, error } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          user_id: userId,
          sender: "user",
          content,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Call external webhook (LLM service)
    await fetch(process.env.WEBHOOK_CLIENT_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.WEBHOOK_SECRET!,
      },
      body: JSON.stringify({
        conversationId,
        messageId: message.id,
        text: content,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/llm-callback`,
      }),
    });

    res.status(200).json({ message });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
