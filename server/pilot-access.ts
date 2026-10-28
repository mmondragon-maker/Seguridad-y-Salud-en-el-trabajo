import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

type AccessEnvironment = {
  EHS_REQUIRE_PILOT_AUTH?: string;
  EHS_PILOT_USER?: string;
  EHS_PILOT_PASSWORD?: string;
};
const digest = (value: string) => createHash("sha256").update(value).digest();

/** A shared pilot gate. This does not implement individual accounts or roles. */
export function createPilotAccess(config: AccessEnvironment = process.env): RequestHandler {
  if (config.EHS_REQUIRE_PILOT_AUTH && !["0", "1"].includes(config.EHS_REQUIRE_PILOT_AUTH)) {
    throw new Error("EHS_REQUIRE_PILOT_AUTH debe ser 0 o 1.");
  }
  const required = config.EHS_REQUIRE_PILOT_AUTH === "1";
  const user = config.EHS_PILOT_USER || "";
  const password = config.EHS_PILOT_PASSWORD || "";
  if (!required && !user && !password) return (_req, _res, next) => next();
  if (!user || !password) {
    throw new Error("Configura EHS_PILOT_USER y EHS_PILOT_PASSWORD antes de iniciar el piloto protegido.");
  }
  if (!/^[A-Za-z0-9_.@-]{1,100}$/.test(user) || password.length < 16 || password.length > 500 || /[\r\n]/.test(password)) {
    throw new Error("El usuario del piloto debe ser simple y la contraseña debe tener entre 16 y 500 caracteres, sin saltos de línea.");
  }
  const expectedUser = digest(user);
  const expectedPassword = digest(password);
  return (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.vary("Authorization");
    // Public, non-personal readiness endpoint for the hosting provider.
    if ((req.method === "GET" || req.method === "HEAD") && req.path === "/api/health") return next();
    const header = req.headers.authorization || "";
    const match = header.length <= 4096 ? /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header) : null;
    if (match) {
      const credentials = Buffer.from(match[1], "base64").toString("utf8");
      const colon = credentials.indexOf(":");
      if (colon > 0) {
        const userMatches = timingSafeEqual(digest(credentials.slice(0, colon)), expectedUser);
        const passwordMatches = timingSafeEqual(digest(credentials.slice(colon + 1)), expectedPassword);
        if (userMatches && passwordMatches) return next();
      }
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="Nexo EHS - piloto privado", charset="UTF-8"');
    res.status(401).json({error:"Este piloto de Nexo EHS requiere usuario y contraseña."});
  };
}
