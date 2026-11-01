// Admin-only teacher management: list, create and delete teacher accounts.
// Runs with the service role (server-side) and rejects callers who are not in
// the `admins` allow-list.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Teacher {
  id: string;
  email: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return json({ error: "Server ist nicht konfiguriert." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Nicht angemeldet." }, 401);

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerUser, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerUser.user) {
    return json({ error: "Nicht angemeldet." }, 401);
  }

  const { data: isAdmin, error: adminError } = await caller.rpc("is_admin");
  if (adminError) return json({ error: adminError.message }, 500);
  if (!isAdmin) {
    return json({ error: "Nur Admins dürfen Lehrpersonen verwalten." }, 403);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const action = String(body.action ?? "");

  try {
    if (action === "list") {
      const { data: rows, error } = await admin.from("admins").select("user_id");
      if (error) throw error;
      const ids = new Set((rows ?? []).map((row) => row.user_id as string));

      const teachers: Teacher[] = [];
      let page = 1;
      while (true) {
        const { data: list, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (listError) throw listError;
        for (const user of list.users) {
          if (ids.has(user.id)) {
            teachers.push({ id: user.id, email: user.email ?? "" });
          }
        }
        if (list.users.length < 200) break;
        page += 1;
        if (page > 20) break;
      }
      teachers.sort((a, b) => a.email.localeCompare(b.email));
      return json({ teachers });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) {
        return json({ error: "E-Mail und Passwort sind erforderlich." }, 400);
      }
      if (password.length < 8) {
        return json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." }, 400);
      }

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError) {
        const message = createError.message ?? "";
        if (/already|registered|exists/i.test(message)) {
          const { data: list } = await admin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const existing = list?.users.find(
            (user) => (user.email ?? "").toLowerCase() === email,
          );
          if (existing) {
            const { error: upsertError } = await admin
              .from("admins")
              .upsert({ user_id: existing.id });
            if (upsertError) throw upsertError;
            return json({ teacher: { id: existing.id, email } });
          }
        }
        return json({ error: message || "Konto konnte nicht erstellt werden." }, 400);
      }

      const { error: insertError } = await admin
        .from("admins")
        .insert({ user_id: created.user.id });
      if (insertError) {
        await admin.auth.admin.deleteUser(created.user.id);
        throw insertError;
      }

      return json({ teacher: { id: created.user.id, email } }, 201);
    }

    if (action === "delete") {
      const userId = String(body.userId ?? "");
      if (!userId) return json({ error: "userId fehlt." }, 400);
      if (userId === callerUser.user.id) {
        return json({ error: "Du kannst dein eigenes Konto nicht löschen." }, 400);
      }

      const { error: deleteAdminError } = await admin
        .from("admins")
        .delete()
        .eq("user_id", userId);
      if (deleteAdminError) throw deleteAdminError;

      const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
      if (deleteUserError) throw deleteUserError;

      return json({ ok: true });
    }

    return json({ error: "Unbekannte Aktion." }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Unbekannter Fehler." },
      500,
    );
  }
});
