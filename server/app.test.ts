import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "./db.js";
import { createApp } from "./app.js";
import { generateAuditAnswer } from "./audit.js";

type Api = (
  path: string,
  method?: string,
  body?: unknown,
) => Promise<{ status: number; body: any }>;
async function withApi(run: (api: Api) => Promise<void>) {
  const db = createDatabase(":memory:");
  const app = createApp(db, { ai: false });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const api: Api = async (path, method = "GET", body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return {
      status: response.status,
      body: response.status === 204 ? undefined : await response.json(),
    };
  };
  try {
    await run(api);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    db.close();
  }
}

test("diagnóstico cambia aplicabilidad y conserva avance al reactivar actividades", async () =>
  withApi(async (api) => {
    const initial = (await api("/obligations")).body;
    assert(initial.some((o: any) => o.id === "nom-009"));
    assert(!initial.some((o: any) => o.id === "nom-031"));
    assert.equal(
      (await api("/obligations/nom-009", "PATCH", { status: "done" })).status,
      422,
    );
    assert.equal(
      (
        await api("/obligations/nom-009", "PATCH", {
          status: "done",
          owner: "Responsable",
          evidence: "Registro revisado ABC-1",
        })
      ).status,
      200,
    );
    const profile = (await api("/company")).body;
    delete profile.id;
    profile.state = "Nuevo León";
    profile.activities.heights = false;
    profile.activities.construction = true;
    assert.equal((await api("/company", "PUT", profile)).status, 200);
    const changed = (await api("/obligations")).body;
    assert(changed.some((o: any) => o.id === "nom-031"));
    assert(!changed.some((o: any) => o.id === "nom-009"));
    assert(
      !changed.some(
        (o: any) =>
          o.jurisdiction === "Estatal" || o.jurisdiction === "Municipal",
      ),
    );
    profile.activities.heights = true;
    await api("/company", "PUT", profile);
    const reactivated = (await api("/obligations")).body.find(
      (o: any) => o.id === "nom-009",
    );
    assert.equal(reactivated.status, "done");
    assert.equal(reactivated.evidence, "Registro revisado ABC-1");
  }));

test("trabajadores y capacitación validan participantes, fechas y preservan relaciones", async () =>
  withApi(async (api) => {
    const worker = await api("/workers", "POST", {
      name: "Persona de prueba",
      curp: "",
      position: "Técnico",
      department: "Pruebas",
    });
    assert.equal(worker.status, 201);
    const base = {
      title: "Curso prueba",
      instructor: "Instructor",
      startDate: "2026-10-27",
      endDate: "2026-10-28",
      hours: 4,
      workerIds: [worker.body.id],
      area: "Seguridad",
    };
    assert.equal(
      (await api("/trainings", "POST", { ...base, endDate: "2026-02-30" }))
        .status,
      422,
    );
    assert.equal(
      (await api("/trainings", "POST", { ...base, endDate: "2026-10-01" }))
        .status,
      422,
    );
    assert.equal(
      (await api("/trainings", "POST", { ...base, workerIds: [999999] }))
        .status,
      422,
    );
    const training = await api("/trainings", "POST", base);
    assert.equal(training.status, 201);
    assert.deepEqual(training.body.workerIds, [worker.body.id]);
    assert(training.body.companyName.includes("DEMO"));
    const edited = await api(`/workers/${worker.body.id}`, "PUT", {
      name: "Persona corregida",
      curp: "",
      position: "Técnico responsable",
      department: "Pruebas",
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.name, "Persona corregida");
    assert.deepEqual(
      (await api("/trainings")).body.find((t: any) => t.id === training.body.id)
        .workerIds,
      [worker.body.id],
    );
    assert.equal(
      (await api(`/workers/${worker.body.id}`, "DELETE")).status,
      409,
    );
    assert.equal(
      (await api(`/trainings/${training.body.id}`, "DELETE")).status,
      204,
    );
    assert.equal(
      (await api(`/workers/${worker.body.id}`, "DELETE")).status,
      204,
    );
  }));

test("matriz de riesgo calcula puntaje y HAZOP exige sus campos técnicos", async () =>
  withApi(async (api) => {
    const base = {
      process: "Transferencia",
      hazard: "Sobrepresión",
      method: "HAZOP",
      likelihood: 4,
      severity: 5,
      controls: "Paro y alivio por validar",
    };
    assert.equal((await api("/risks", "POST", base)).status, 422);
    const risk = await api("/risks", "POST", {
      ...base,
      guideword: "Más",
      deviation: "Presión alta",
      cause: "Válvula cerrada",
      consequence: "Fuga",
      recommendation: "Verificar protección",
    });
    assert.equal(risk.status, 201);
    assert.equal(risk.body.score, 20);
    assert.equal(risk.body.level, "high");
    assert.equal(
      (
        await api("/risks", "POST", {
          ...base,
          method: "General",
          likelihood: 6,
        })
      ).status,
      422,
    );
  }));

test("consulta no atribuye fundamento a documentos internos, no revisados o sin evidencia", async () =>
  withApi(async (api) => {
    const noEvidence = await api("/audit/query", "POST", {
      question: "¿Qué dice el procedimiento de equipo?",
    });
    assert.equal(noEvidence.status, 200);
    assert.deepEqual(noEvidence.body.citations, []);
    assert.equal(noEvidence.body.mode, "retrieval");
    const doc = {
      title: "Texto de prueba: no es una ley real",
      jurisdiction: "Federal",
      url: "https://www.dof.gob.mx/ejemplo-prueba",
      text: "Texto sintético de prueba. El término brigadistas aparece en este extracto.",
      kind: "official",
      reviewed: false,
    };
    const created = await api("/documents", "POST", doc);
    assert.equal(created.status, 201);
    assert.deepEqual(
      (await api("/audit/query", "POST", { question: "brigadistas" })).body
        .citations,
      [],
    );
    assert.equal(
      (await api(`/documents/${created.body.id}`, "PATCH", { reviewed: true }))
        .status,
      200,
    );
    const query = (
      await api("/audit/query", "POST", { question: "brigadistas" })
    ).body;
    assert.equal(query.citations.length, 1);
    assert.equal(query.citations[0].id, created.body.id);
    assert.equal(query.citations[0].excerpt, doc.text);
    assert.equal(query.requiresReview, true);
    assert.equal(
      (
        await api("/documents", "POST", {
          ...doc,
          reviewed: true,
          url: "https://example.com/legal",
        })
      ).status,
      422,
    );
    assert.equal(
      (await api("/documents", "POST", { ...doc, url: "javascript:alert(1)" }))
        .status,
      422,
    );
    await api(`/documents/${created.body.id}`, "PATCH", { reviewed: false });
    assert.deepEqual(
      (await api("/audit/query", "POST", { question: "brigadistas" })).body
        .citations,
      [],
    );
  }));

test("recuperación de párrafos extensos conserva la coincidencia dentro del extracto", async () =>
  withApi(async (api) => {
    const text = `${"Texto previo de prueba. ".repeat(220)}palabrasingular contenido relevante al final.`;
    await api("/documents", "POST", {
      title: "Documento sintético para prueba",
      jurisdiction: "Federal",
      url: "https://www.dof.gob.mx/prueba",
      text,
      kind: "official",
      reviewed: true,
    });
    const response = (
      await api("/audit/query", "POST", { question: "palabrasingular" })
    ).body;
    assert(response.citations.length > 0);
    assert(response.citations[0].excerpt.includes("palabrasingular"));
  }));

test("valida campos e identificadores, evita errores SQL y rutas API HTML", async () =>
  withApi(async (api) => {
    assert.equal((await api("/health")).body.status, "ok");
    assert.equal(
      (
        await api("/workers", "POST", {
          name: "X",
          position: "X",
          department: "X",
          extra: "no",
        })
      ).status,
      422,
    );
    assert.equal((await api("/workers/not-an-id", "DELETE")).status, 400);
    assert.equal((await api("/workers/999999", "DELETE")).status, 404);
    assert.equal((await api("/unknown")).status, 404);
    assert.equal(
      (await api("/obligations/nom-002", "PATCH", { dueDate: "2026-02-30" }))
        .status,
      422,
    );
    const summary = (await api("/dashboard")).body;
    assert.equal(summary.metrics.workers, 6);
    assert.equal(summary.metrics.trainings, 2);
    assert(summary.metrics.totalObligations > 0);
  }));

test("SQLite persiste datos y no duplica la demostración al reabrir", () => {
  const dir = mkdtempSync(join(tmpdir(), "ehs-test-"));
  const file = join(dir, "data.sqlite");
  try {
    const first = createDatabase(file);
    first
      .prepare("UPDATE company SET name=? WHERE id=1")
      .run("Persistencia verificada");
    first.close();
    const second = createDatabase(file);
    assert.equal(
      second.prepare("SELECT name FROM company").get()!.name,
      "Persistencia verificada",
    );
    assert.equal(
      second.prepare("SELECT COUNT(*) AS n FROM workers").get()!.n,
      6,
    );
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("IA opcional preserva evidencia y rechaza referencias ajenas al corpus", async () => {
  const citations = [
    {
      id: 1,
      title: "Fuente sintética de prueba",
      url: "https://www.dof.gob.mx/prueba",
      jurisdiction: "Federal",
      excerpt: "Texto de prueba",
    },
  ];
  const request = (content: unknown) => async () =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(content) } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  const invalid = await generateAuditAnswer("prueba", citations, {
    key: "fake-test-key",
    fetcher: request({
      answer: "Afirmación [999]",
      sourceIds: [999],
    }) as typeof fetch,
  });
  assert(invalid && "warning" in invalid);
  const hiddenInvalid = await generateAuditAnswer("prueba", citations, {
    key: "fake-test-key",
    fetcher: request({
      answer: "Texto válido [1] y una fuente inventada [999]",
      sourceIds: [1],
    }) as typeof fetch,
  });
  assert(hiddenInvalid && "warning" in hiddenInvalid);
  const valid = await generateAuditAnswer("prueba", citations, {
    key: "fake-test-key",
    fetcher: request({
      answer: "Texto de prueba [1]",
      sourceIds: [1],
    }) as typeof fetch,
  });
  assert(valid && "answer" in valid);
  assert.equal(valid.answer, "Texto de prueba [1]");
  const failed = await generateAuditAnswer("prueba", citations, {
    key: "fake-test-key",
    fetcher: (async () => {
      throw new Error("Service failed");
    }) as typeof fetch,
  });
  assert(failed && "warning" in failed);
});
