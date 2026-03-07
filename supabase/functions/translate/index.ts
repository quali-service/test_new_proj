// Edge Function: translate
// Translates a word or phrase to French using OpenAI gpt-4o-mini.

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS });
    }

    try {
        const { text } = await req.json();

        if (!text?.trim()) {
            return new Response(JSON.stringify({ error: "text is required" }), {
                status: 400,
                headers: { ...CORS, "Content-Type": "application/json" },
            });
        }

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a translator. Translate the user's text to French. Output only the translation, no explanation, no quotes."
                    },
                    { role: "user", content: text.trim() }
                ],
                temperature: 0.2,
                max_tokens: 200,
            }),
        });

        if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
        const data = await res.json();
        const translation = data.choices[0].message.content.trim();

        return new Response(JSON.stringify({ translation }), {
            headers: { ...CORS, "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("translate error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...CORS, "Content-Type": "application/json" },
        });
    }
});
