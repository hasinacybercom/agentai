import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers["x-webhook-secret"] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  try {
    const { conversationId, messageId, aiText } = req.body;

    // Insert bot reply
    await supabaseAdmin.from("messages").insert([
      {
        conversation_id: conversationId,
        sender: "bot",
        content: aiText,
        status: "done",
      },
    ]);

    // Mark user message as done
    await supabaseAdmin
      .from("messages")
      .update({ status: "done" })
      .eq("id", messageId);

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
