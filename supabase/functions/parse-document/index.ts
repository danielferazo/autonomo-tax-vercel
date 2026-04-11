import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ZAI_API_URL = "https://api.z.ai/api/anthropic/v1/messages";

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/m, "");
  cleaned = cleaned.replace(/\n?```\s*$/m, "");
  return cleaned.trim();
}

interface ParseRequest {
  file_base64: string;
  document_type: "invoice" | "expense";
  filename: string;
  mime_type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      },
    });
  }

  try {
    const body: ParseRequest = await req.json();
    const { file_base64, document_type, filename, mime_type } = body;

    if (!file_base64 || !document_type || !filename) {
      return jsonResponse({ success: false, error: "Missing required fields", code: "INVALID_INPUT" }, 400);
    }

    if (!["invoice", "expense"].includes(document_type)) {
      return jsonResponse({ success: false, error: "document_type must be 'invoice' or 'expense'", code: "INVALID_INPUT" }, 400);
    }

    const apiKey = Deno.env.get("ZAI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ success: false, error: "AI API key not configured", code: "CONFIG_ERROR" }, 500);
    }

    // Extract base64 data from data URL
    const base64Data = file_base64.includes(",") ? file_base64.split(",")[1] : file_base64;
    const mediaType = mime_type || (file_base64.includes("image/png") ? "image/png" : "image/jpeg");

    // Build prompt based on document type
    const systemPrompt = document_type === "invoice"
      ? `You are an expert at extracting structured data from freelance invoices.
Return ONLY valid JSON with no markdown formatting or explanation.
Schema: {"number":"string","date":"YYYY-MM-DD","client":"string","currency":"USD|EUR","gross_orig":number,"iva_collected":number,"irpf_retained":number}
If a field cannot be determined, use null.`
      : `You are an expert at extracting structured data from expense receipts.
Return ONLY valid JSON with no markdown formatting or explanation.
Schema: {"description":"string","date":"YYYY-MM-DD","gross":number,"iva_paid":number,"category":"rent|electricity|water|internet|phone|cuota|software|hardware|other"}
Choose the most appropriate category from the list. If a field cannot be determined, use null.`;

    // Call Z.ai API (Anthropic-compatible) with GLM-4V-Flash
    const aiResponse = await fetch(ZAI_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4v-flash",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Extract data from this document. Return JSON matching the schema exactly.` },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
          ],
        }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`Z.ai API error: ${aiResponse.status}`, errorText);
      return jsonResponse({ success: false, error: "AI extraction failed", code: "AI_PARSE_FAILED" }, 502);
    }

    const aiData = await aiResponse.json();
    const textBlock = aiData.content?.find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) {
      return jsonResponse({ success: false, error: "AI returned no text", code: "AI_PARSE_FAILED" }, 502);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(stripMarkdownFences(textBlock.text));
    } catch {
      console.error("Failed to parse AI response:", textBlock.text);
      return jsonResponse({ success: false, error: "AI returned invalid JSON", code: "AI_PARSE_FAILED" }, 502);
    }

    // Return only parsed fields — storage and DB save is handled by the client page
    return jsonResponse({ success: true, data: parsed });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
