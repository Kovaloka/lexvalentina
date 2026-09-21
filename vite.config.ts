import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    /* Bound to the IPv4 loopback on purpose.
       Vite's default host is the string "localhost", which on Windows resolves
       to ::1 first — so Vite listens on IPv6 while the Netlify CLI probes
       127.0.0.1, finds nothing, and times out saying the framework server
       never started. It did start; the two were looking at different
       addresses that share a name. Naming the address removes the ambiguity. */
    host: "127.0.0.1",
    port: 5173,
    /* Fail loudly rather than drifting to 5174, which netlify.toml would then
       be pointing at the wrong port for. */
    strictPort: true,
  },
});
