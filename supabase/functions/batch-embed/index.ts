// Edge Function: batch-embed
// Processes a small batch of un-embedded resources per invocation.
// Call repeatedly until {"remaining":0} is returned.
//
// Optional body: { "batch_size": 10 }  (default: 10)

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

    const body = await req.json().catch(() => ({}));
    const batch_size: number = body.batch_size ?? 10;

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: resources, error } = await supabase
        .from("ressources")
        .select("id, title, learning")
        .is("embedding", null)
        .limit(batch_size);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!resources || resources.length === 0) {
        return new Response(JSON.stringify({ done: 0, remaining: 0, message: "All embedded!" }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    let done = 0;
    let failed = 0;

    for (const r of resources) {
        const text = [r.title, r.learning].filter(Boolean).join(" — ").trim();
        if (!text) { failed++; continue; }

        try {
            const embedding = await getEmbedding(text);
            await supabase.from("ressources").update({ embedding }).eq("id", r.id);
            done++;
            console.log(`✅ "${r.title}"`);
        } catch (err) {
            console.error(`❌ id=${r.id}:`, err);
            failed++;
        }
    }

    const { count } = await supabase
        .from("ressources")
        .select("*", { count: "exact", head: true })
        .is("embedding", null);

    return new Response(
        JSON.stringify({ done, failed, remaining: count ?? "?" }),
        { headers: { "Content-Type": "application/json" } }
    );
});
