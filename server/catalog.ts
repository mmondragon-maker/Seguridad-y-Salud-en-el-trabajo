export type Activities = {
  construction: boolean;
  chemicals: boolean;
  heights: boolean;
  waste: boolean;
};
export type Company = {
  id: number;
  name: string;
  industry: string;
  state: string;
  municipality: string;
  employees: number;
  rfc: string;
  activities: Activities;
};

type CatalogEntry = {
  id: string;
  title: string;
  reference: string;
  authority: string;
  jurisdiction: string;
  category: string;
  description: string;
  sourceUrl: string;
  applies: (company: Company) => string | false;
};
const stps = "https://www.gob.mx/stps";
const dof = "https://www.dof.gob.mx/";
const employees = (company: Company) =>
  company.employees > 0 &&
  "El diagnóstico registra personal en el centro de trabajo.";
const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// Catálogo de orientación: sus reglas priorizan una revisión, nunca acreditan cumplimiento.
// Las páginas son portales oficiales de consulta, no vínculos a un numeral ya cotejado.
export const catalog: CatalogEntry[] = [
  {
    id: "nom-002",
    title: "Prevención y protección contra incendios",
    reference: "NOM-002-STPS-2010",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Seguridad",
    description:
      "Revisar clasificación del riesgo de incendio, medidas de prevención y evidencias aplicables al centro.",
    sourceUrl: stps,
    applies: employees,
  },
  {
    id: "nom-019",
    title: "Comisión de seguridad e higiene",
    reference: "NOM-019-STPS-2011",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Seguridad",
    description:
      "Cotejar las obligaciones de integración, recorridos y documentación de la comisión.",
    sourceUrl: stps,
    applies: employees,
  },
  {
    id: "nom-030",
    title: "Servicios preventivos de seguridad y salud",
    reference: "NOM-030-STPS-2009",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Salud",
    description:
      "Revisar diagnóstico y programa de acciones preventivas y correctivas según las características del centro.",
    sourceUrl: stps,
    applies: employees,
  },
  {
    id: "nom-035",
    title: "Factores de riesgo psicosocial",
    reference: "NOM-035-STPS-2018",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Salud",
    description:
      "Determinar las obligaciones que corresponden al tamaño y condiciones del centro; la inclusión no sustituye esa evaluación.",
    sourceUrl: stps,
    applies: employees,
  },
  {
    id: "nom-009",
    title: "Condiciones de seguridad en trabajos en altura",
    reference: "NOM-009-STPS-2011",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Seguridad",
    description:
      "Verificar alcance, procedimientos, equipos y medidas para los trabajos en altura identificados.",
    sourceUrl: stps,
    applies: (c) =>
      c.activities.heights && "Se declararon actividades de trabajo en altura.",
  },
  {
    id: "nom-018",
    title: "Comunicación de peligros químicos",
    reference: "NOM-018-STPS-2015",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Seguridad",
    description:
      "Cotejar la aplicación del sistema de identificación y comunicación de peligros por sustancias químicas.",
    sourceUrl: stps,
    applies: (c) =>
      c.activities.chemicals && "Se declaró manejo de sustancias químicas.",
  },
  {
    id: "nom-005",
    title: "Manejo de sustancias químicas peligrosas",
    reference: "NOM-005-STPS-1998",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Seguridad",
    description:
      "Revisar alcance y vigencia de las condiciones de seguridad para manejo, transporte y almacenamiento.",
    sourceUrl: stps,
    applies: (c) =>
      c.activities.chemicals &&
      "Se declaró manejo de sustancias químicas; falta clasificar sus peligros.",
  },
  {
    id: "nom-031",
    title: "Seguridad y salud en la construcción",
    reference: "NOM-031-STPS-2011",
    authority: "STPS",
    jurisdiction: "Federal",
    category: "Seguridad",
    description:
      "Determinar el alcance de la norma, clasificación de obra y obligaciones particulares antes de generar un programa.",
    sourceUrl: stps,
    applies: (c) =>
      c.activities.construction && "Se declararon actividades de construcción.",
  },
  {
    id: "lgpgir",
    title: "Caracterización y gestión de residuos",
    reference:
      "Ley General para la Prevención y Gestión Integral de los Residuos",
    authority: "SEMARNAT / autoridad competente",
    jurisdiction: "Federal",
    category: "Medio ambiente",
    description:
      "Clasificar residuos y categoría del generador; identificar la competencia federal, estatal o municipal antes de atribuir trámites.",
    sourceUrl: dof,
    applies: (c) =>
      c.activities.waste &&
      "Se declaró generación de residuos; su clasificación y volumen siguen pendientes.",
  },
  {
    id: "jalisco-ambiente",
    title: "Revisión de obligaciones ambientales de Jalisco",
    reference:
      "Ley Estatal del Equilibrio Ecológico y la Protección al Ambiente de Jalisco",
    authority: "SEMADET / autoridad competente",
    jurisdiction: "Estatal",
    category: "Medio ambiente",
    description:
      "Revisar el texto vigente y la competencia de las autoridades según giro, emisiones, descargas y autorizaciones existentes.",
    sourceUrl: "https://periodicooficial.jalisco.gob.mx/",
    applies: (c) =>
      normalized(c.state) === "jalisco" &&
      "La instalación se ubica en Jalisco; requiere análisis estatal específico.",
  },
  {
    id: "municipal-pc",
    title: "Identificar requisitos municipales de Protección Civil",
    reference: "Reglamentación municipal vigente por cotejar",
    authority: "Protección Civil municipal",
    jurisdiction: "Municipal",
    category: "Protección civil",
    description:
      "Localizar el reglamento vigente del municipio y evaluar requisitos del inmueble y actividad. No se presupone un trámite o artículo concreto.",
    sourceUrl: "https://www.jalisco.gob.mx/",
    applies: (c) =>
      normalized(c.state) === "jalisco" &&
      `Se declaró el municipio de ${c.municipality}; falta cotejar su reglamentación vigente.`,
  },
];

export const legalNotice =
  "Matriz orientativa basada en reglas declaradas. Cada referencia, vigencia, alcance y evidencia requiere cotejo por una persona competente; los porcentajes reflejan gestión interna y no certifican cumplimiento legal.";
