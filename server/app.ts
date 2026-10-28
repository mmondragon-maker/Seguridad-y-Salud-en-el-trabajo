import express, { type ErrorRequestHandler } from "express";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { createDatabase } from "./db.js";
import { catalog, legalNotice, type Company } from "./catalog.js";
import { generateAuditAnswer } from "./audit.js";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const text = (max = 200) => z.string().trim().min(1).max(max);
const optionalText = (max = 1000) => z.string().trim().max(max).default("");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Fecha inexistente");
const optionalDate = z.union([date, z.literal("")]);
const rfc = z
  .string()
  .trim()
  .toUpperCase()
  .max(13)
  .refine(
    (v) => !v || /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v),
    "RFC con formato inválido",
  )
  .default("");
const companySchema = z
  .object({
    name: text(),
    industry: text(),
    state: text(100),
    municipality: text(100),
    employees: z.number().int().min(0).max(1000000),
    rfc,
    activities: z
      .object({
        construction: z.boolean(),
        chemicals: z.boolean(),
        heights: z.boolean(),
        waste: z.boolean(),
      })
      .strict(),
  })
  .strict();
const workerSchema = z
  .object({
    name: text(),
    curp: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) =>
          !v || /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v),
        "CURP con formato inválido",
      )
      .default(""),
    position: text(),
    department: text(),
  })
  .strict();
const trainingSchema = z
  .object({
    title: text(),
    instructor: text(),
    startDate: date,
    endDate: date,
    hours: z.number().positive().max(10000),
    workerIds: z
      .array(z.number().int().positive())
      .min(1)
      .max(5000)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "No repetir participantes",
      ),
    area: optionalText(200),
    companyName: optionalText(200),
    companyRfc: rfc,
  })
  .strict()
  .refine(
    (v) => v.endDate >= v.startDate,
    "La fecha final debe ser igual o posterior a la inicial",
  );
const riskSchema = z
  .object({
    process: text(),
    hazard: text(2000),
    method: z.enum(["General", "HAZOP", "NOM-031"]).default("General"),
    likelihood: z.number().int().min(1).max(5),
    severity: z.number().int().min(1).max(5),
    controls: text(4000),
    guideword: optionalText(200),
    deviation: optionalText(2000),
    cause: optionalText(2000),
    consequence: optionalText(2000),
    recommendation: optionalText(4000),
  })
  .strict()
  .refine(
    (v) =>
      v.method !== "HAZOP" ||
      [v.guideword, v.deviation, v.cause, v.consequence].every(Boolean),
    "HAZOP requiere palabra guía, desviación, causa y consecuencia",
  );
const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Utiliza una URL HTTPS sin credenciales");
export const officialUrl = (value: string) => {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (u.hostname.endsWith(".gob.mx") || u.hostname === "gob.mx")
    );
  } catch {
    return false;
  }
};
const documentSchema = z
  .object({
    title: text(),
    jurisdiction: text(100),
    url: safeUrl.default(""),
    reviewed: z.boolean().default(false),
    text: text(200000),
    kind: z.enum(["official", "internal"]).default("official"),
  })
  .strict()
  .refine(
    (d) => !(d.kind === "official" && d.reviewed) || officialUrl(d.url),
    "Para revisar una fuente oficial se requiere su URL HTTPS de un dominio gubernamental mexicano .gob.mx",
  );
const progressSchema = z
  .object({
    status: z.enum(["pending", "in_progress", "done"]).optional(),
    owner: z.string().trim().max(200).optional(),
    dueDate: optionalDate.optional(),
    evidence: z.string().trim().max(4000).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Indica al menos un campo");

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new HttpError(422, "Revisa los campos del formulario.");
    Object.assign(error, {
      details: result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    throw error;
  }
  return result.data;
}
function idValue(value: unknown) {
  const s = String(value);
  if (!/^[1-9]\d*$/.test(s) || !Number.isSafeInteger(Number(s)))
    throw new HttpError(400, "Identificador inválido.");
  return Number(s);
}
function company(db: DatabaseSync): Company {
  const row = db.prepare("SELECT * FROM company WHERE id=1").get()!;
  return { ...row, activities: JSON.parse(String(row.activities)) } as Company;
}
function obligations(db: DatabaseSync) {
  const current = company(db);
  const progress = new Map(
    db
      .prepare("SELECT * FROM obligation_progress")
      .all()
      .map((row) => [row.id, row]),
  );
  return catalog.flatMap((entry) => {
    const reason = entry.applies(current);
    if (!reason) return [];
    const { applies: _, ...metadata } = entry;
    const state = progress.get(entry.id)!;
    return [
      {
        ...metadata,
        status: String(state.status),
        owner: String(state.owner),
        dueDate: String(state.dueDate),
        evidence: String(state.evidence),
        reason,
        verification: "pending" as const,
      },
    ];
  });
}
function trainings(db: DatabaseSync) {
  const participants = db.prepare(
    "SELECT workerId FROM training_workers WHERE trainingId=? ORDER BY workerId",
  );
  return db
    .prepare("SELECT * FROM trainings ORDER BY startDate DESC,id DESC")
    .all()
    .map((row) => ({
      ...row,
      id: Number(row.id),
      workerIds: participants
        .all(Number(row.id))
        .map((p) => Number(p.workerId)),
    }));
}
function risks(db: DatabaseSync) {
  return db
    .prepare("SELECT * FROM risks ORDER BY id DESC")
    .all()
    .map((row) => {
      const score = Number(row.likelihood) * Number(row.severity);
      return {
        ...row,
        id: Number(row.id),
        score,
        level: score >= 15 ? "high" : score >= 8 ? "medium" : "low",
      };
    });
}
function documents(db: DatabaseSync) {
  return db
    .prepare("SELECT * FROM documents ORDER BY id DESC")
    .all()
    .map((row) => ({
      ...row,
      id: Number(row.id),
      title: String(row.title),
      jurisdiction: String(row.jurisdiction),
      url: String(row.url),
      text: String(row.text),
      kind: String(row.kind),
      reviewed: Boolean(row.reviewed),
    }));
}
const stopWords = new Set(
  "para como donde cuando sobre tiene tiene deben debe cual cuales esta este estos estas una uno unos unas que por con del las los una un el la de en y o a se al es son mi me hay segun norma articulo cumplimiento seguridad salud trabajo".split(
    " ",
  ),
);
function tokens(text: string) {
  return [
    ...new Set(
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .match(/[a-z0-9]{3,}/g) || [],
    ),
  ].filter((t) => !stopWords.has(t));
}

export function createApp(
  db = createDatabase(),
  options: { ai?: boolean } = {},
) {
  const app = express();
  app.locals.db = db;
  app.disable("x-powered-by");
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({
      status: "ok",
      database: "sqlite",
      mode: "local-demo",
      aiEnabled: Boolean(process.env.EHS_AI_API_KEY),
    });
  });
  app.get("/api/company", (_req, res) => res.json(company(db)));
  app.put("/api/company", (req, res) => {
    const v = parse(companySchema, req.body);
    db.prepare(
      "UPDATE company SET name=?,industry=?,state=?,municipality=?,employees=?,rfc=?,activities=? WHERE id=1",
    ).run(
      v.name,
      v.industry,
      v.state,
      v.municipality,
      v.employees,
      v.rfc,
      JSON.stringify(v.activities),
    );
    res.json(company(db));
  });
  app.get("/api/dashboard", (_req, res) => {
    const list = obligations(db);
    const riskList = risks(db);
    const trainingList = trainings(db);
    const completedObligations = list.filter((o) => o.status === "done").length;
    res.json({
      company: company(db),
      metrics: {
        totalObligations: list.length,
        completedObligations,
        inProgressObligations: list.filter((o) => o.status === "in_progress")
          .length,
        pendingObligations: list.filter((o) => o.status === "pending").length,
        progress: list.length
          ? Math.round((completedObligations / list.length) * 100)
          : 0,
        workers: Number(
          db.prepare("SELECT COUNT(*) AS n FROM workers").get()!.n,
        ),
        trainings: trainingList.length,
        risks: riskList.length,
        highRisks: riskList.filter((r) => r.level === "high").length,
      },
      obligations: list,
      recentTrainings: trainingList.slice(0, 5),
      risks: riskList,
      legalNotice,
    });
  });
  app.get("/api/obligations", (_req, res) => res.json(obligations(db)));
  app.patch("/api/obligations/:id", (req, res) => {
    const id = String(req.params.id);
    if (!catalog.some((c) => c.id === id))
      throw new HttpError(404, "Referencia no encontrada.");
    const patch = parse(progressSchema, req.body);
    const old = db
      .prepare("SELECT * FROM obligation_progress WHERE id=?")
      .get(id)!;
    const updated = { ...old, ...patch };
    if (updated.status === "done" && !String(updated.evidence || "").trim())
      throw new HttpError(
        422,
        "Para cerrar una acción, registra la evidencia documental.",
      );
    db.prepare(
      "UPDATE obligation_progress SET status=?,owner=?,dueDate=?,evidence=? WHERE id=?",
    ).run(
      String(updated.status),
      String(updated.owner),
      String(updated.dueDate),
      String(updated.evidence),
      id,
    );
    res.json(
      obligations(db).find((o) => o.id === id) || {
        ...updated,
        verification: "pending",
      },
    );
  });
  app.get("/api/workers", (_req, res) =>
    res.json(db.prepare("SELECT * FROM workers ORDER BY id").all()),
  );
  app.post("/api/workers", (req, res) => {
    const v = parse(workerSchema, req.body);
    const result = db
      .prepare(
        "INSERT INTO workers(name,curp,position,department) VALUES(?,?,?,?)",
      )
      .run(v.name, v.curp, v.position, v.department);
    res
      .status(201)
      .json(
        db
          .prepare("SELECT * FROM workers WHERE id=?")
          .get(Number(result.lastInsertRowid)),
      );
  });
  app.put("/api/workers/:id", (req, res) => {
    const id = idValue(req.params.id);
    const v = parse(workerSchema, req.body);
    if (
      !db
        .prepare(
          "UPDATE workers SET name=?,curp=?,position=?,department=? WHERE id=?",
        )
        .run(v.name, v.curp, v.position, v.department, id).changes
    )
      throw new HttpError(404, "Persona no encontrada.");
    res.json(db.prepare("SELECT * FROM workers WHERE id=?").get(id));
  });
  app.delete("/api/workers/:id", (req, res) => {
    const id = idValue(req.params.id);
    if (
      db
        .prepare(
          "SELECT trainingId FROM training_workers WHERE workerId=? LIMIT 1",
        )
        .get(id)
    )
      throw new HttpError(
        409,
        "La persona tiene constancias registradas. Conserva su historial o elimina antes las capacitaciones asociadas.",
      );
    if (!db.prepare("DELETE FROM workers WHERE id=?").run(id).changes)
      throw new HttpError(404, "Persona no encontrada.");
    res.status(204).end();
  });
  app.get("/api/trainings", (_req, res) => res.json(trainings(db)));
  app.post("/api/trainings", (req, res) => {
    const v = parse(trainingSchema, req.body);
    const exists = db.prepare("SELECT id FROM workers WHERE id=?");
    if (v.workerIds.some((id) => !exists.get(id)))
      throw new HttpError(422, "Uno o más participantes no existen.");
    const c = company(db);
    db.exec("BEGIN");
    let id: number;
    try {
      const result = db
        .prepare(
          "INSERT INTO trainings(title,instructor,startDate,endDate,hours,area,companyName,companyRfc) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          v.title,
          v.instructor,
          v.startDate,
          v.endDate,
          v.hours,
          v.area,
          v.companyName || c.name,
          v.companyRfc || c.rfc,
        );
      id = Number(result.lastInsertRowid);
      const participant = db.prepare(
        "INSERT INTO training_workers VALUES(?,?)",
      );
      for (const workerId of v.workerIds) participant.run(id, workerId);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    res.status(201).json(trainings(db).find((t) => t.id === id));
  });
  app.delete("/api/trainings/:id", (req, res) => {
    if (
      !db
        .prepare("DELETE FROM trainings WHERE id=?")
        .run(idValue(req.params.id)).changes
    )
      throw new HttpError(404, "Capacitación no encontrada.");
    res.status(204).end();
  });
  app.get("/api/risks", (_req, res) => res.json(risks(db)));
  app.post("/api/risks", (req, res) => {
    const v = parse(riskSchema, req.body);
    const result = db
      .prepare(
        "INSERT INTO risks(process,hazard,method,likelihood,severity,controls,guideword,deviation,cause,consequence,recommendation) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        v.process,
        v.hazard,
        v.method,
        v.likelihood,
        v.severity,
        v.controls,
        v.guideword,
        v.deviation,
        v.cause,
        v.consequence,
        v.recommendation,
      );
    res
      .status(201)
      .json(risks(db).find((r) => r.id === Number(result.lastInsertRowid)));
  });
  app.delete("/api/risks/:id", (req, res) => {
    if (
      !db.prepare("DELETE FROM risks WHERE id=?").run(idValue(req.params.id))
        .changes
    )
      throw new HttpError(404, "Riesgo no encontrado.");
    res.status(204).end();
  });
  app.get("/api/documents", (_req, res) => res.json(documents(db)));
  app.post("/api/documents", (req, res) => {
    const v = parse(documentSchema, req.body);
    const result = db
      .prepare(
        "INSERT INTO documents(title,jurisdiction,url,reviewed,text,kind) VALUES(?,?,?,?,?,?)",
      )
      .run(v.title, v.jurisdiction, v.url, Number(v.reviewed), v.text, v.kind);
    res
      .status(201)
      .json(documents(db).find((d) => d.id === Number(result.lastInsertRowid)));
  });
  app.patch("/api/documents/:id", (req, res) => {
    const id = idValue(req.params.id);
    const v = parse(z.object({ reviewed: z.boolean() }).strict(), req.body);
    const row = db.prepare("SELECT * FROM documents WHERE id=?").get(id);
    if (!row) throw new HttpError(404, "Documento no encontrado.");
    if (v.reviewed && row.kind === "official" && !officialUrl(String(row.url)))
      throw new HttpError(
        422,
        "La revisión de una fuente oficial requiere una URL gubernamental mexicana HTTPS.",
      );
    db.prepare("UPDATE documents SET reviewed=? WHERE id=?").run(
      Number(v.reviewed),
      id,
    );
    res.json(documents(db).find((d) => d.id === id));
  });
  app.delete("/api/documents/:id", (req, res) => {
    if (
      !db
        .prepare("DELETE FROM documents WHERE id=?")
        .run(idValue(req.params.id)).changes
    )
      throw new HttpError(404, "Documento no encontrado.");
    res.status(204).end();
  });
  app.post("/api/audit/query", async (req, res) => {
    const { question } = parse(
      z.object({ question: text(2000) }).strict(),
      req.body,
    );
    const query = tokens(question);
    const verified = documents(db).filter(
      (d) => d.reviewed && d.kind === "official" && officialUrl(String(d.url)),
    );
    const ranked = verified
      .flatMap((d) => {
        const titleTokens = tokens(String(d.title));
        const paragraphs = String(d.text)
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
          .flatMap((paragraph) => {
            const chunks: string[] = [];
            for (let start = 0; start < paragraph.length; start += 1600)
              chunks.push(paragraph.slice(start, start + 1800));
            return chunks;
          });
        return paragraphs
          .map((excerpt) => {
            const words = new Set(tokens(excerpt));
            const score = query.reduce(
              (n, t) =>
                n + (words.has(t) ? 2 : 0) + (titleTokens.includes(t) ? 1 : 0),
              0,
            );
            return {
              id: d.id,
              title: d.title,
              url: d.url,
              jurisdiction: d.jurisdiction,
              excerpt,
              score,
            };
          })
          .filter((hit) => hit.score > 0);
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ score: _, ...citation }) => citation);
    const generated =
      options.ai === false ? null : await generateAuditAnswer(question, ranked);
    res.json({
      answer:
        generated && "answer" in generated
          ? generated.answer
          : ranked.length
            ? "Se recuperaron los siguientes extractos textuales de documentos oficiales marcados como revisados por el usuario. No se ha generado una interpretación ni verificado automáticamente su autenticidad, vigencia o alcance. Coteja cada fuente antes de responder una inspección."
            : "No hay evidencia normativa revisada que permita fundamentar esta consulta. Agrega el texto pertinente de una fuente oficial, su URL y la confirmación de cotejo. No se puede afirmar un artículo, numeral o defensa sin esa evidencia.",
      citations: ranked,
      mode: generated && "answer" in generated ? "rag" : "retrieval",
      requiresReview: true,
      ...(generated && "warning" in generated
        ? { warning: generated.warning }
        : {}),
      notice:
        generated && "answer" in generated
          ? "Borrador generado por IA a partir del corpus recuperado; requiere revisión técnica y jurídica. La validación de ids no garantiza la corrección de la interpretación."
          : "Búsqueda textual local; sin generación por IA en esta respuesta. La revisión documental es una declaración del usuario.",
    });
  });
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "Ruta API no encontrada.")),
  );
  const handler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
      res
        .status(error.status)
        .json({
          error: error.message,
          ...("details" in error ? { details: error.details } : {}),
        });
      return;
    }
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "El contenido excede el máximo de 1 MB." });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ error: "El cuerpo JSON no es válido." });
      return;
    }
    console.error(
      "EHS API error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    res.status(500).json({ error: "No se pudo completar la operación." });
  };
  app.use(handler);
  return app;
}
