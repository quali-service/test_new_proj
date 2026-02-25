// Edge Function: embed-resource
// Triggered by a Database Webhook on INSERT to the "ressources" table.
// Calls OpenAI text-embedding-3-small and writes the vector back to the row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function getEmbedding(text: string): Promise<number[]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.data[0].embedding;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    try {
        const { record } = await req.json();
        if (!record?.id) return new Response("No record", { status: 400 });

        const text = [record.title, record.learning].filter(Boolean).join(" — ").trim();
        if (!text) return new Response("Nothing to embed", { status: 200 });

        const embedding = await getEmbedding(text);

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { error } = await supabase
            .from("ressources")
            .update({ embedding })
            .eq("id", record.id);

        if (error) throw error;

        console.log(`✅ Embedded ressource ${record.id}: "${record.title}"`);
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("embed-resource error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
