// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const devApiPlugin = {
  name: "dev-auth-api",
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith("/api/auth/") || req.url?.startsWith("/api/supabase/")) {
        try {
          const { handleAuthApiRequest } = await import("./src/lib/server-auth-handler");
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost:3000";
          const fullUrl = `${protocol}://${host}${req.url}`;

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          const body = chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined;

          const webReq = new Request(fullUrl, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
          });

          const webRes = await handleAuthApiRequest(webReq);
          if (webRes) {
            res.statusCode = webRes.status;
            webRes.headers.forEach((val: string, key: string) => res.setHeader(key, val));
            const resBuffer = Buffer.from(await webRes.arrayBuffer());
            res.end(resBuffer);
            return;
          }
        } catch (e) {
          console.error("[dev-auth-api error]", e);
        }
      }
      next();
    });
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
  },
  vite: {
    plugins: [devApiPlugin],
    esbuild: {
      jsxDev: false,
    },
  },
});
