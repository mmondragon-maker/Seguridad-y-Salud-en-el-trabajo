import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { createPilotAccess } from "./pilot-access.ts";
import { createDatabase } from "./db.ts";
import { createApp } from "./app.ts";

test("el piloto protege interfaz y API, permite health y rechaza escrituras sin credenciales", async () => {
  const db = createDatabase(":memory:");
  const app = express();
  app.use(createPilotAccess({EHS_REQUIRE_PILOT_AUTH:"1", EHS_PILOT_USER:"piloto", EHS_PILOT_PASSWORD:"clave-ficticia-solo-para-prueba"}));
  app.use(createApp(db, {ai:false}));
  app.get("/", (_req,res) => res.send("Interfaz del piloto"));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve,reject) => {server.once("listening",resolve);server.once("error",reject);});
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const authorization = `Basic ${Buffer.from("piloto:clave-ficticia-solo-para-prueba").toString("base64")}`;
  try {
    assert.equal((await fetch(base+"/api/health")).status,200);
    for (const route of ["/", "/assets/app.js", "/api/company", "/api/workers"]) {
      const response = await fetch(base+route);
      assert.equal(response.status,401);
      assert(response.headers.get("www-authenticate")?.startsWith("Basic "));
    }
    const blocked = await fetch(base+"/api/workers", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"No guardar",position:"Prueba",department:"Prueba"})});
    assert.equal(blocked.status,401);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM workers").get()!.n,6);
    assert.equal((await fetch(base+"/api/company",{headers:{authorization:"Basic invalid"}})).status,401);
    assert.equal((await fetch(base+"/api/company",{headers:{authorization}})).status,200);
    assert.equal(await (await fetch(base+"/",{headers:{authorization}})).text(),"Interfaz del piloto");
    const allowed = await fetch(base+"/api/workers",{method:"POST",headers:{authorization,"Content-Type":"application/json"},body:JSON.stringify({name:"Persona ficticia",position:"Prueba",department:"Prueba"})});
    assert.equal(allowed.status,201);
  } finally {
    await new Promise<void>(done => server.close(() => done()));
    db.close();
  }
});

test("el despliegue protegido exige credenciales completas; el desarrollo local conserva su acceso", () => {
  assert.throws(() => createPilotAccess({EHS_REQUIRE_PILOT_AUTH:"true"}),/0 o 1/);
  assert.throws(() => createPilotAccess({EHS_REQUIRE_PILOT_AUTH:"1"}),/Configura/);
  assert.throws(() => createPilotAccess({EHS_PILOT_USER:"piloto"}),/Configura/);
  assert.throws(() => createPilotAccess({EHS_PILOT_USER:"piloto",EHS_PILOT_PASSWORD:"corta"}),/16/);
  assert.throws(() => createPilotAccess({EHS_PILOT_USER:"usuario:invalido",EHS_PILOT_PASSWORD:"clave-ficticia-larga-para-prueba"}),/usuario/);
  let nextCalled = false;
  createPilotAccess({})({} as never,{} as never,() => {nextCalled=true;});
  assert.equal(nextCalled,true);
});
