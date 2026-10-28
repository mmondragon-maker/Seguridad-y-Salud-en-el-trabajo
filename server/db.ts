import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { catalog } from "./catalog.js";

export function createDatabase(
  path = process.env.EHS_DB_PATH || "data/ehs.sqlite",
) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS company (
      id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL, industry TEXT NOT NULL,
      state TEXT NOT NULL, municipality TEXT NOT NULL, employees INTEGER NOT NULL,
      rfc TEXT NOT NULL DEFAULT '', activities TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS obligation_progress (
      id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
      owner TEXT NOT NULL DEFAULT '', dueDate TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, curp TEXT NOT NULL DEFAULT '', position TEXT NOT NULL,
      department TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trainings (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, instructor TEXT NOT NULL, startDate TEXT NOT NULL,
      endDate TEXT NOT NULL, hours REAL NOT NULL, area TEXT NOT NULL DEFAULT '',
      companyName TEXT NOT NULL, companyRfc TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS training_workers (
      trainingId INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
      workerId INTEGER NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
      PRIMARY KEY(trainingId,workerId)
    );
    CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY, process TEXT NOT NULL, hazard TEXT NOT NULL, method TEXT NOT NULL,
      likelihood INTEGER NOT NULL, severity INTEGER NOT NULL, controls TEXT NOT NULL,
      guideword TEXT NOT NULL DEFAULT '', deviation TEXT NOT NULL DEFAULT '', cause TEXT NOT NULL DEFAULT '',
      consequence TEXT NOT NULL DEFAULT '', recommendation TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY, title TEXT NOT NULL, jurisdiction TEXT NOT NULL, url TEXT NOT NULL,
      reviewed INTEGER NOT NULL DEFAULT 0 CHECK(reviewed IN (0,1)), text TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('official','internal')), createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const existing = db.prepare("SELECT id FROM company WHERE id=1").get();
  if (!existing) {
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO company VALUES(1,?,?,?,?,?,?,?)").run(
        "Industrias del Occidente · DEMO",
        "Manufactura",
        "Jalisco",
        "Guadalajara",
        48,
        "",
        JSON.stringify({
          construction: false,
          chemicals: true,
          heights: true,
          waste: true,
        }),
      );
      const progress = db.prepare(
        "INSERT OR IGNORE INTO obligation_progress(id,status,owner,evidence) VALUES(?,?,?,?)",
      );
      for (const c of catalog) progress.run(c.id, "pending", "", "");
      db.prepare(
        "UPDATE obligation_progress SET status=?,owner=?,evidence=? WHERE id=?",
      ).run(
        "in_progress",
        "Coordinación EHS",
        "Diagnóstico inicial de demostración; pendiente validación documental.",
        "nom-030",
      );
      const worker = db.prepare(
        "INSERT INTO workers(name,curp,position,department) VALUES(?,?,?,?)",
      );
      const people = [
        ["Ana López Martínez", "Supervisora de producción", "Producción"],
        ["Carlos Ramírez Soto", "Operador de maquinaria", "Producción"],
        ["Lucía Hernández Díaz", "Técnica de mantenimiento", "Mantenimiento"],
        ["Miguel Torres Ruiz", "Almacenista", "Almacén"],
        ["Sofía García Pérez", "Coordinadora EHS", "Seguridad y salud"],
        ["Jorge Mendoza León", "Auxiliar de producción", "Producción"],
      ];
      for (const p of people) worker.run(p[0], "", p[1], p[2]);
      const training = db.prepare(
        "INSERT INTO trainings(title,instructor,startDate,endDate,hours,area,companyName,companyRfc) VALUES(?,?,?,?,?,?,?,?)",
      );
      training.run(
        "Inducción a la seguridad · DEMO",
        "Instructor de demostración",
        "2026-10-01",
        "2026-10-01",
        4,
        "Seguridad",
        "Industrias del Occidente · DEMO",
        "",
      );
      training.run(
        "Identificación de peligros químicos · DEMO",
        "Instructor de demostración",
        "2026-10-15",
        "2026-10-15",
        8,
        "Seguridad",
        "Industrias del Occidente · DEMO",
        "",
      );
      const participant = db.prepare(
        "INSERT INTO training_workers VALUES(?,?)",
      );
      for (const id of [1, 2, 3, 4, 5, 6]) participant.run(1, id);
      for (const id of [3, 4, 5]) participant.run(2, id);
      db.prepare(
        "INSERT INTO risks(process,hazard,method,likelihood,severity,controls,recommendation) VALUES(?,?,?,?,?,?,?)",
      ).run(
        "Almacenamiento de sustancias",
        "Contacto con sustancias químicas",
        "General",
        3,
        4,
        "Etiquetado, hojas de datos de seguridad y ventilación por verificar.",
        "Validar compatibilidad, contención y capacitación.",
      );
      db.prepare(
        "INSERT INTO risks(process,hazard,method,likelihood,severity,controls,guideword,deviation,cause,consequence,recommendation) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        "Transferencia de líquido · DEMO",
        "Sobrepresión en línea",
        "HAZOP",
        3,
        5,
        "Paro manual; funcionamiento pendiente de verificar.",
        "Más",
        "Más presión que la condición de diseño",
        "Bloqueo de la descarga",
        "Pérdida de contención y exposición del personal",
        "Revisar diseño, alivio y prueba de protecciones con equipo multidisciplinario.",
      );
      db.prepare(
        "INSERT INTO documents(title,jurisdiction,url,reviewed,text,kind) VALUES(?,?,?,?,?,?)",
      ).run(
        "Procedimiento interno de demostración",
        "Interna",
        "",
        1,
        "Documento ficticio para mostrar el registro documental. Antes de intervenir un equipo, el responsable interno identifica los peligros y documenta las medidas acordadas. Este contenido no es una disposición legal ni constituye una fuente normativa.",
        "internal",
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const insert = db.prepare(
    "INSERT OR IGNORE INTO obligation_progress(id) VALUES(?)",
  );
  for (const c of catalog) insert.run(c.id);
  return db;
}
