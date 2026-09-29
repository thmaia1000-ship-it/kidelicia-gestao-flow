import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://dxlcdwrlqcuowigmlwsu.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_TCcQ5f3yH--vS6VcebZN5g_BHZY1haV";

const serverSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export async function handleAuthApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    try {
      const { email, password } = (await request.json()) as { email?: string; password?: string };
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const { data, error } = await serverSupabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const message =
          error.message === "Invalid login credentials"
            ? "Credenciais inválidas. Verifique e-mail e senha."
            : error.message;
        return new Response(JSON.stringify({ error: message }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ session: data.session, user: data.user }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      console.error("[/api/auth/login error]", err);
      return new Response(
        JSON.stringify({
          error: "Erro no servidor de autenticação. Tente novamente.",
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }

  if (url.pathname === "/api/auth/signup" && request.method === "POST") {
    try {
      const { email, password, fullName } = (await request.json()) as {
        email?: string;
        password?: string;
        fullName?: string;
      };
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const { data, error } = await serverSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName?.trim() || "" },
        },
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ session: data.session, user: data.user }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      console.error("[/api/auth/signup error]", err);
      return new Response(
        JSON.stringify({
          error: "Erro ao criar conta no servidor.",
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }

  if (url.pathname === "/api/auth/recover" && request.method === "POST") {
    try {
      const { email, redirectTo } = (await request.json()) as {
        email?: string;
        redirectTo?: string;
      };
      if (!email) {
        return new Response(JSON.stringify({ error: "Informe seu e-mail cadastrado." }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const { error } = await serverSupabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      console.error("[/api/auth/recover error]", err);
      return new Response(
        JSON.stringify({
          error: "Erro ao enviar link de recuperação.",
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
  }

  if (url.pathname === "/api/supabase/proxy" && request.method === "POST") {
    try {
      const payload = (await request.json()) as {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      };

      const targetUrl = new URL(payload.url);
      const allowedOrigin = new URL(SUPABASE_URL).origin;

      if (targetUrl.origin !== allowedOrigin && !targetUrl.hostname.endsWith(".supabase.co")) {
        return new Response(JSON.stringify({ error: "Destino não autorizado." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }

      const forwardHeaders = new Headers(payload.headers || {});
      if (!forwardHeaders.has("apikey")) {
        forwardHeaders.set("apikey", SUPABASE_PUBLISHABLE_KEY);
      }

      const response = await fetch(targetUrl.toString(), {
        method: payload.method || "GET",
        headers: forwardHeaders,
        body: payload.body,
      });

      const respHeaders = new Headers();
      for (const [k, v] of response.headers.entries()) {
        if (!["content-encoding", "transfer-encoding", "connection"].includes(k.toLowerCase())) {
          respHeaders.set(k, v);
        }
      }
      respHeaders.set("access-control-allow-origin", "*");

      const bodyBuffer = await response.arrayBuffer();
      return new Response(bodyBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
      });
    } catch (proxyErr) {
      console.error("[/api/supabase/proxy error]", proxyErr);
      return new Response(
        JSON.stringify({
          error: "Erro de proxy",
          message: proxyErr instanceof Error ? proxyErr.message : String(proxyErr),
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
  }

  return null;
}
