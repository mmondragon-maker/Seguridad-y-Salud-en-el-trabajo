import express from "express";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { createPilotAccess } from "./pilot-access.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const access = createPilotAccess();
const app = createApp();
const entry = express();
entry.disable("x-powered-by");
entry.use(access);
entry.use(app);
const server = createServer(entry);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT debe ser un puerto válido.");

let vite:
  Awaited<ReturnType<(typeof import("vite"))["createServer"]>> | undefined;
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*splat}", (_req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    root,
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.get("/{*splat}", async (req, res, next) => {
    try {
      const template = await readFile(path.join(root, "index.html"), "utf8");
      res
        .type("html")
        .send(await vite!.transformIndexHtml(req.originalUrl, template));
    } catch (error) {
      next(error);
    }
  });
}

server.on("error", (error) => {
  console.error("No se pudo iniciar Nexo EHS:", error.message);
  void shutdown().finally(() => process.exit(1));
});
server.listen(port, host, () =>
  console.log(
    `Nexo EHS iniciado en ${host}:${port} (${process.env.NODE_ENV || "development"}). Piloto con datos de demostración.`,
  ),
);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close();
  await vite?.close();
  server.closeAllConnections();
  app.locals.db?.close();
}
process.once("SIGTERM", () => {
  void shutdown();
});
process.once("SIGINT", () => {
  void shutdown();
});
