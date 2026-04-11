import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { table, action, id, data } = await req.json();

    if (!table || !action || !id) {
      return jsonResponse({ success: false, error: "table, action, and id are required" }, 400);
    }

    if (!["invoices", "expenses"].includes(table)) {
      return jsonResponse({ success: false, error: "table must be 'invoices' or 'expenses'" }, 400);
    }

    if (!["update", "delete"].includes(action)) {
      return jsonResponse({ success: false, error: "action must be 'update' or 'delete'" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "delete") {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return jsonResponse({ success: false, error: error.message }, 500);
      return jsonResponse({ success: true });
    }

    // update
    if (!data) {
      return jsonResponse({ success: false, error: "data is required for update" }, 400);
    }

    const { data: updated, error } = await supabase
      .from(table)
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) return jsonResponse({ success: false, error: error.message }, 500);
    return jsonResponse({ success: true, data: updated });
  } catch (err) {
    return jsonResponse({ success: false, error: "Internal server error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
