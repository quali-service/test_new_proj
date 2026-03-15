// Edge Function: search-resources
// Called from the frontend with a text query.
// Embeds the query via OpenAI and returns the top N most similar resources.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

async function getEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        signal: controller.signal,
        headers: {
            "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) throw new Error("Empty embedding from OpenAI");
    return embedding;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS });
    }

    try {
        const { query, match_count = 3, match_threshold = 0.4 } = await req.json();

        if (!query?.trim()) {
            return new Response(JSON.stringify([]), {
                headers: { ...CORS, "Content-Type": "application/json" },
            });
        }

        const query_embedding = await getEmbedding(query.trim());

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
        );

        const { data, error } = await supabase.rpc("match_ressources", {
            query_embedding,
            match_threshold,
            match_count,
        });

        if (error) throw error;

        return new Response(JSON.stringify(data ?? []), {
            headers: { ...CORS, "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("search-resources error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...CORS, "Content-Type": "application/json" },
        });
    }
});
