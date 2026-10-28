import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FlaskConical,
  HardHat,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  X,
  ExternalLink,
  CalendarDays,
  Pencil,
} from "lucide-react";

type Page = "dashboard" | "company" | "matrix" | "people" | "risks" | "audit";
type Company = {
  id?: number;
  rfc?: string;
  name: string;
  industry: string;
  state: string;
  municipality: string;
  employees: number;
  activities: {
    construction: boolean;
    chemicals: boolean;
    heights: boolean;
    waste: boolean;
  };
};
type Obligation = {
  id: string;
  title: string;
  reference: string;
  authority: string;
  jurisdiction: string;
  category: string;
  description: string;
  reason: string;
  sourceUrl: string;
  verification: string;
  status: string;
  owner: string;
  dueDate: string;
  evidence: string;
};
type Worker = {
  id: number;
  name: string;
  curp: string;
  position: string;
  department: string;
};
type Training = {
  id: number;
  title: string;
  instructor: string;
  startDate: string;
  endDate: string;
  hours: number;
  workerIds: number[];
  area: string;
  companyName: string;
  companyRfc: string;
};
type Risk = {
  id: number;
  process: string;
  hazard: string;
  method: string;
  likelihood: number;
  severity: number;
  controls: string;
  score: number;
  level: string;
  guideword?: string;
  deviation?: string;
  cause?: string;
  consequence?: string;
  recommendation?: string;
};
type Document = {
  id: number;
  title: string;
  jurisdiction: string;
  url: string;
  reviewed: boolean;
  text: string;
  kind: "official" | "internal";
};
type Citation = {
  id: number;
  title: string;
  url: string;
  excerpt: string;
  jurisdiction: string;
};
type Answer = {
  answer: string;
  citations: Citation[];
  mode: string;
  requiresReview: boolean;
  notice?: string;
  warning?: string;
};
type Dashboard = {
  company: Company;
  metrics: {
    totalObligations: number;
    completedObligations: number;
    inProgressObligations: number;
    pendingObligations: number;
    progress: number;
    workers: number;
    trainings: number;
    risks: number;
    highRisks: number;
  };
  obligations: Obligation[];
  recentTrainings: Training[];
  risks: Risk[];
};

const navigation: {
  id: Page;
  label: string;
  icon: typeof Activity;
  section?: string;
}[] = [
  {
    id: "dashboard",
    label: "Vista general",
    icon: LayoutDashboard,
    section: "WORKSPACE",
  },
  { id: "company", label: "Diagnóstico de empresa", icon: Building2 },
  { id: "matrix", label: "Matriz legal", icon: ClipboardCheck },
  {
    id: "people",
    label: "Personas y capacitación",
    icon: Users,
    section: "GESTIÓN OPERATIVA",
  },
  { id: "risks", label: "Análisis de riesgos", icon: HardHat },
  {
    id: "audit",
    label: "Consultor de auditoría",
    icon: MessageSquareText,
    section: "INTELIGENCIA NORMATIVA",
  },
];
const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En proceso",
  done: "Completado",
};
const blankCompany: Company = {
  name: "",
  industry: "Manufactura",
  state: "Jalisco",
  municipality: "Guadalajara",
  employees: 1,
  activities: {
    construction: false,
    chemicals: false,
    heights: false,
    waste: false,
  },
};
const date = (value: string) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Sin fecha";
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      data.details?.length
        ? `${data.error} ${data.details.map((detail: { field: string; message: string }) => `${detail.field}: ${detail.message}`).join(" · ")}`
        : data.error ||
            `No se pudo completar la solicitud (${response.status}).`,
    );
  return data as T;
}
const json = (data: unknown) => JSON.stringify(data);
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  icon: Icon = FileText,
  title,
  children,
}: {
  icon?: typeof Activity;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error-box" role="alert">
      <TriangleAlert size={17} />
      {error}
    </div>
  ) : null;
}
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  large = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  large?: boolean;
}) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className={`modal ${large ? "large" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        value === "done" ? "green" : value === "in_progress" ? "blue" : "amber"
      }
    >
      <span className="status-dot" />
      {statusLabels[value] || value}
    </Badge>
  );
}

export default function App() {
  const initialPage = window.location.hash.slice(1) as Page;
  const [page, setPage] = useState<Page>(
    navigation.some((item) => item.id === initialPage)
      ? initialPage
      : "dashboard",
  );
  const [company, setCompany] = useState<Company>(blankCompany);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState("");
  const [temporaryData, setTemporaryData] = useState(false);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4500);
  };
  const go = (next: Page) => {
    window.location.hash = next;
    setPage(next);
    setSidebarOpen(false);
  };
  useEffect(() => {
    const change = () => {
      const next = (window.location.hash.slice(1) || "dashboard") as Page;
      if (navigation.some((item) => item.id === next)) setPage(next);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    api<Company>("/company")
      .then(setCompany)
      .catch(() => {});
  }, [revision]);
  useEffect(() => {
    api<{ temporaryData?: boolean }>("/health")
      .then((health) => setTemporaryData(Boolean(health.temporaryData)))
      .catch(() => {});
  }, []);
  const refresh = () => setRevision((value) => value + 1);
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => go("dashboard")}
          aria-label="Nexo, ir al inicio"
        >
          <span className="brand-symbol">
            <ShieldCheck size={26} strokeWidth={1.8} />
          </span>
          <span>
            nexo<span className="brand-period">.</span>
            <small>EHS INTELLIGENCE</small>
          </span>
        </button>
        <div className="workspace-card">
          <span className="workspace-icon">
            <Building2 size={18} />
          </span>
          <div>
            <strong>{company.name || "Tu organización"}</strong>
            <small>Centro de trabajo · México</small>
          </div>
          <Badge tone="dark">DEMO</Badge>
        </div>
        <nav aria-label="Navegación principal">
          {navigation.map((item) => (
            <div key={item.id}>
              {item.section && (
                <div className="nav-section">{item.section}</div>
              )}
              <button
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => go(item.id)}
              >
                <item.icon size={19} strokeWidth={1.7} />
                <span>{item.label}</span>
                {item.id === "audit" && (
                  <Sparkles className="nav-sparkle" size={14} />
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-info">
            <span className="live-dot" />
            <span>Entorno de desarrollo local</span>
          </div>
          <p>
            Datos de demostración. Revisa fuentes y vigencia antes de tomar
            decisiones.
          </p>
          <div className="sidebar-user">
            <span className="avatar">EH</span>
            <div>
              <strong>Equipo EHS</strong>
              <small>Espacio de trabajo local</small>
            </div>
            <ShieldCheck size={18} />
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu size={22} />
            </button>
            <span>Mi organización</span>
            <ChevronRight size={14} />
            <strong>
              {navigation.find((item) => item.id === page)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="location">
              <MapPin size={15} />
              {company.municipality}, {company.state}
            </span>
            <span className="topbar-divider" />
            <span className="topbar-avatar">EH</span>
          </div>
        </header>
        {temporaryData && (
          <div className="temporary-data-notice" role="note">
            <TriangleAlert size={18} aria-hidden="true" />
            <span>
              <strong>Prueba temporal.</strong> Usa datos ficticios: los registros
              pueden perderse al reiniciar el servicio.
            </span>
          </div>
        )}
        <main key={page}>
          {page === "dashboard" && (
            <DashboardPage revision={revision} go={go} />
          )}
          {page === "company" && (
            <CompanyPage
              company={company}
              onSave={() => {
                refresh();
                notify(
                  "Perfil actualizado. La matriz legal se recalculó con tus actividades.",
                );
              }}
            />
          )}
          {page === "matrix" && (
            <MatrixPage
              revision={revision}
              changed={() => {
                refresh();
                notify("Seguimiento de obligación guardado.");
              }}
            />
          )}
          {page === "people" && (
            <PeoplePage company={company} changed={refresh} notify={notify} />
          )}
          {page === "risks" && <RisksPage notify={notify} changed={refresh} />}
          {page === "audit" && <AuditPage notify={notify} />}
          <footer className="page-footer">
            <span>
              nexo. <b>EHS Intelligence</b>
            </span>
            <span>
              Piloto · Manufactura en Guadalajara{" "}
              <span className="footer-dot">•</span> México
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={19} />
          {toast}
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Cerrar aviso"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardPage({
  revision,
  go,
}: {
  revision: number;
  go: (page: Page) => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Dashboard>("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, [revision]);
  if (error) return <ErrorBox error={error} />;
  if (!data)
    return (
      <div className="page-loading">
        <LoaderCircle className="spin" size={24} />
        Cargando tu operación…
      </div>
    );
  const m = data.metrics;
  const pending = data.obligations
    .filter((item) => item.status !== "done")
    .slice(0, 4);
  const percentage = Math.round(m.progress);
  const categoryCounts = Object.entries(
    data.obligations.reduce((acc: Record<string, number>, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {}),
  );
  return (
    <>
      <PageHeading
        eyebrow="CONTROL Y VISIBILIDAD"
        title="Tu operación, bajo control."
        description="Una visión clara de tus obligaciones, tu equipo y los próximos pasos."
      >
        <button className="button secondary" onClick={() => go("company")}>
          <Settings2 size={16} />
          Editar diagnóstico
        </button>
        <button className="button primary" onClick={() => go("matrix")}>
          Ver matriz legal
          <ArrowUpRight size={17} />
        </button>
      </PageHeading>
      <div className="pilot-banner">
        <span className="pilot-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <strong>Tu matriz se adapta a tu operación</strong>
          <span>
            {data.company.industry} en {data.company.municipality},{" "}
            {data.company.state}. Requisitos federales y referencias locales en
            un solo lugar.
          </span>
        </div>
        <Badge tone="green">Piloto de demostración</Badge>
      </div>
      <div className="stats-grid">
        <Stat
          icon={ClipboardCheck}
          label="Obligaciones identificadas"
          value={m.totalObligations}
          detail="Según el perfil de tu centro de trabajo"
          tone="teal"
          action={() => go("matrix")}
        />
        <Stat
          icon={FileCheck2}
          label="Acciones completadas"
          value={m.completedObligations}
          detail={`${m.inProgressObligations} en proceso de atención`}
          tone="green"
          action={() => go("matrix")}
        />
        <Stat
          icon={Users}
          label="Personas registradas"
          value={m.workers}
          detail={`${m.trainings} actividades de capacitación`}
          tone="blue"
          action={() => go("people")}
        />
        <Stat
          icon={TriangleAlert}
          label="Riesgos prioritarios"
          value={m.highRisks}
          detail={`${m.risks} riesgos evaluados en tu operación`}
          tone="orange"
          action={() => go("risks")}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel progress-panel">
          <div className="panel-heading">
            <div>
              <h2>Avance de autogestión</h2>
              <p>Seguimiento de las acciones registradas</p>
            </div>
            <ShieldCheck size={21} className="muted" />
          </div>
          <div className="progress-content">
            <div
              className="donut"
              style={{
                background: `conic-gradient(var(--teal) ${percentage}%, #edf2f1 ${percentage}% 100%)`,
              }}
            >
              <div>
                <strong>
                  {percentage}
                  <small>%</small>
                </strong>
                <span>avance registrado</span>
              </div>
            </div>
            <div className="progress-legend">
              <div>
                <span className="legend-dot green-dot" />
                Completadas<strong>{m.completedObligations}</strong>
              </div>
              <div>
                <span className="legend-dot blue-dot" />
                En proceso<strong>{m.inProgressObligations}</strong>
              </div>
              <div>
                <span className="legend-dot light-dot" />
                Pendientes<strong>{m.pendingObligations}</strong>
              </div>
            </div>
          </div>
          <div className="panel-note">
            <CircleHelp size={15} />
            El avance refleja tu seguimiento, no una certificación de
            cumplimiento.
          </div>
        </section>
        <section className="panel priorities-panel">
          <div className="panel-heading">
            <div>
              <h2>Tu siguiente paso</h2>
              <p>Convierte tus obligaciones en acciones</p>
            </div>
            <button className="text-button" onClick={() => go("matrix")}>
              Ver todas
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="priority-list">
            {pending.length ? (
              pending.map((item, index) => (
                <button
                  className="priority-row"
                  key={item.id}
                  onClick={() => go("matrix")}
                >
                  <span className={`priority-number priority-${index}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.reference} <span className="dot-separator">·</span>{" "}
                      {item.owner || "Sin responsable"}
                    </span>
                  </div>
                  <Status value={item.status} />
                  <ChevronRight size={16} />
                </button>
              ))
            ) : (
              <Empty title="Todas las acciones están completadas">
                Revisa periódicamente la vigencia y tus evidencias.
              </Empty>
            )}
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Panorama normativo</h2>
              <p>Obligaciones por ámbito de gestión</p>
            </div>
            <BookOpen size={20} className="muted" />
          </div>
          <div className="category-list">
            {categoryCounts.map(([category, count], index) => (
              <div className="category-row" key={category}>
                <span className={`category-icon color-${index % 3}`}>
                  {index % 3 === 0 ? (
                    <ShieldCheck size={17} />
                  ) : index % 3 === 1 ? (
                    <Leaf size={17} />
                  ) : (
                    <Building2 size={17} />
                  )}
                </span>
                <div>
                  <div>
                    <span>{category}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="category-track">
                    <span
                      style={{
                        width: `${(count / m.totalObligations) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="panel-link" onClick={() => go("matrix")}>
            Explorar obligaciones aplicables
            <ArrowRight size={16} />
          </button>
        </section>
        <section className="panel training-preview">
          <div className="panel-heading">
            <div>
              <h2>Capacitación en movimiento</h2>
              <p>Desarrolla las competencias de tu equipo</p>
            </div>
            <span className="small-icon">
              <Users size={18} />
            </span>
          </div>
          {data.recentTrainings.length ? (
            data.recentTrainings.slice(0, 2).map((training) => (
              <div className="training-preview-row" key={training.id}>
                <span className="file-icon">
                  <FileCheck2 size={20} />
                </span>
                <div>
                  <strong>{training.title}</strong>
                  <p>
                    {training.workerIds.length} participantes{" "}
                    <span className="dot-separator">·</span> {training.hours}{" "}
                    horas
                  </p>
                  <small>{date(training.endDate)}</small>
                </div>
                <Badge tone="neutral">Registrada</Badge>
              </div>
            ))
          ) : (
            <Empty title="Prepara tu primera capacitación" />
          )}
          <button className="panel-link" onClick={() => go("people")}>
            Gestionar personas y borradores DC-3
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <div className="source-disclaimer">
        <ShieldCheck size={18} />
        <p>
          <strong>Trazabilidad desde el primer día.</strong> Las referencias del
          catálogo requieren cotejo de fuente oficial, vigencia y aplicabilidad.
          Adjunta evidencias y valida cada obligación con tu especialista.
        </p>
      </div>
    </>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  action,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  detail: string;
  tone: string;
  action: () => void;
}) {
  return (
    <button className="stat-card" onClick={action}>
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>
          <Icon size={19} />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-detail">
        {detail}
        <ArrowUpRight size={14} />
      </div>
    </button>
  );
}

function CompanyPage({
  company,
  onSave,
}: {
  company: Company;
  onSave: () => void;
}) {
  const [form, setForm] = useState<Company>(company);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setForm(company), [company]);
  const update = (key: keyof Company, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { id: _id, ...payload } = form;
      await api("/company", { method: "PUT", body: json(payload) });
      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="EL PUNTO DE PARTIDA"
        title="Conozcamos tu operación."
        description="El perfil de tu centro de trabajo determina qué referencias aparecen en tu matriz."
      />
      <div className="company-layout">
        <form className="panel form-panel" onSubmit={save}>
          <div className="section-label">
            <span className="small-icon">
              <Building2 size={20} />
            </span>
            <div>
              <h2>Perfil del centro de trabajo</h2>
              <p>Información utilizada por el motor de diagnóstico.</p>
            </div>
          </div>
          <ErrorBox error={error} />
          <div className="form-grid">
            <Field label="Nombre o razón social" wide>
              <input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="RFC de la empresa" wide>
              <input
                maxLength={13}
                value={form.rfc || ""}
                onChange={(e) => update("rfc", e.target.value.toUpperCase())}
                placeholder="Opcional. Se usará en nuevos borradores DC-3."
              />
            </Field>
            <Field label="Giro o actividad económica">
              <input
                required
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="Ej. Manufactura"
              />
            </Field>
            <Field label="Número de personas trabajadoras">
              <input
                type="number"
                required
                min="1"
                max="1000000"
                value={form.employees}
                onChange={(e) => update("employees", Number(e.target.value))}
              />
            </Field>
            <Field label="Estado">
              <input
                required
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              />
            </Field>
            <Field label="Municipio">
              <input
                required
                value={form.municipality}
                onChange={(e) => update("municipality", e.target.value)}
              />
            </Field>
          </div>
          <div className="form-divider" />
          <h3>Actividades y condiciones</h3>
          <p className="form-description">
            Selecciona las actividades que se realizan, aunque sean ocasionales.
          </p>
          <div className="activity-grid">
            {(
              [
                {
                  key: "construction",
                  icon: HardHat,
                  label: "Obras de construcción",
                  text: "Construcción, modificación o demolición",
                },
                {
                  key: "chemicals",
                  icon: FlaskConical,
                  label: "Sustancias químicas",
                  text: "Manejo, transporte o almacenamiento",
                },
                {
                  key: "heights",
                  icon: Activity,
                  label: "Trabajos en altura",
                  text: "Actividades con riesgo de caída",
                },
                {
                  key: "waste",
                  icon: Leaf,
                  label: "Generación de residuos",
                  text: "Residuos de los procesos de operación",
                },
              ] as const
            ).map((activity) => (
              <label
                className={`activity-option ${form.activities[activity.key] ? "selected" : ""}`}
                key={activity.key}
              >
                <input
                  type="checkbox"
                  checked={form.activities[activity.key]}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      activities: {
                        ...prev.activities,
                        [activity.key]: e.target.checked,
                      },
                    }))
                  }
                />
                <span className="activity-check">
                  {form.activities[activity.key] && <Check size={13} />}
                </span>
                <activity.icon size={22} />
                <div>
                  <strong>{activity.label}</strong>
                  <small>{activity.text}</small>
                </div>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <span>
              <ShieldCheck size={15} />
              Tus cambios se guardan en este entorno.
            </span>
            <button className="button primary" disabled={saving}>
              {saving ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Check size={17} />
              )}
              Guardar y actualizar matriz
            </button>
          </div>
        </form>
        <aside className="info-card">
          <div className="info-card-icon">
            <Sparkles size={24} />
          </div>
          <h2>Un diagnóstico que evoluciona contigo</h2>
          <p>
            El motor aplica reglas explícitas al giro, ubicación y actividades
            de tu instalación.
          </p>
          <ol>
            <li>
              <span>01</span>Define el perfil de tu centro de trabajo.
            </li>
            <li>
              <span>02</span>Obtén referencias federales y locales.
            </li>
            <li>
              <span>03</span>Revisa la aplicabilidad y asigna responsables.
            </li>
          </ol>
          <div className="info-note">
            <CircleHelp size={17} />
            <p>
              El piloto incluye referencias de Jalisco. Otras ubicaciones
              requieren ampliar y validar el catálogo local. No sustituye una
              evaluación técnica.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function MatrixPage({
  revision,
  changed,
}: {
  revision: number;
  changed: () => void;
}) {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [scope, setScope] = useState("all");
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api<Obligation[]>("/obligations")
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [revision]);
  const filtered = items.filter(
    (item) =>
      (filter === "all" || item.status === filter) &&
      (scope === "all" || item.jurisdiction === scope) &&
      `${item.title} ${item.reference} ${item.category}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await api(`/obligations/${selected.id}`, {
        method: "PATCH",
        body: json({
          status: selected.status,
          owner: selected.owner,
          dueDate: selected.dueDate,
          evidence: selected.evidence,
        }),
      });
      setSelected(null);
      changed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function exportCsv() {
    const escape = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
        text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [
      [
        "Referencia",
        "Obligación",
        "Ámbito",
        "Estado",
        "Responsable",
        "Fecha objetivo",
        "Evidencia",
        "Verificación de fuente",
      ],
      ...filtered.map((item) => [
        item.reference,
        item.title,
        item.jurisdiction,
        statusLabels[item.status],
        item.owner,
        item.dueDate,
        item.evidence,
        "Pendiente de cotejo oficial",
      ]),
    ];
    const blob = new Blob(
      ["\ufeff" + rows.map((row) => row.map(escape).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexo-matriz-legal.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow="CUMPLIMIENTO CON TRAZABILIDAD"
        title="Tu matriz legal, en acción."
        description="Revisa las referencias identificadas y documenta cómo atiendes cada obligación."
      >
        <button
          className="button secondary"
          onClick={exportCsv}
          disabled={!items.length}
        >
          <ArrowDownToLine size={16} />
          Exportar matriz
        </button>
      </PageHeading>
      <ErrorBox error={!selected ? error : ""} />
      <div className="matrix-summary">
        <div>
          <span className="small-icon">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <strong>{items.length} referencias identificadas</strong>
            <span>Catálogo orientativo · Cotejo oficial pendiente</span>
          </div>
        </div>
        <Badge tone="amber">
          <CircleHelp size={13} />
          Requiere revisión técnica
        </Badge>
      </div>
      <section className="panel">
        <div className="table-tools">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Buscar obligaciones"
              placeholder="Buscar norma, obligación o categoría…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <select
              aria-label="Filtrar por ámbito"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="all">Todos los ámbitos</option>
              {[...new Set(items.map((item) => item.jurisdiction))].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
            <select
              aria-label="Filtrar por estado"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Referencia / obligación</th>
                <th>Ámbito</th>
                <th>Responsable</th>
                <th>Fecha objetivo</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected({ ...item })}
                  className="clickable"
                >
                  <td>
                    <div className="table-primary">{item.title}</div>
                    <div className="table-secondary">{item.reference}</div>
                  </td>
                  <td>
                    <Badge>{item.jurisdiction}</Badge>
                    <span className="cell-small">{item.category}</span>
                  </td>
                  <td>
                    {item.owner || <span className="muted">Sin asignar</span>}
                  </td>
                  <td className="nowrap">{date(item.dueDate)}</td>
                  <td>
                    <Status value={item.status} />
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${item.title}`}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="loading-inline">
            <LoaderCircle className="spin" size={20} />
            Identificando referencias…
          </div>
        ) : (
          !filtered.length && (
            <Empty icon={Search} title="No se encontraron obligaciones">
              Prueba otra búsqueda o cambia los filtros.
            </Empty>
          )
        )}
        <div className="table-footer">
          {filtered.length} de {items.length} referencias{" "}
          <span>Haz clic en una obligación para registrar su seguimiento.</span>
        </div>
      </section>
      {selected && (
        <Modal
          title={selected.title}
          subtitle={selected.reference}
          onClose={() => setSelected(null)}
          large
        >
          <form onSubmit={save}>
            <ErrorBox error={error} />
            <div className="obligation-description">
              <div className="badge-row">
                <Badge>{selected.jurisdiction}</Badge>
                <Badge>{selected.authority}</Badge>
                <Badge tone="amber">Fuente pendiente de cotejo</Badge>
              </div>
              <p>{selected.description}</p>
              <h4>¿Por qué aparece en tu matriz?</h4>
              <p>{selected.reason}</p>
              {selected.sourceUrl && (
                <a
                  className="text-link"
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar referencia oficial
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="form-grid">
              <Field label="Estado de seguimiento">
                <select
                  value={selected.status}
                  onChange={(e) =>
                    setSelected({ ...selected, status: e.target.value })
                  }
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha objetivo">
                <input
                  type="date"
                  value={selected.dueDate || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Responsable" wide>
                <input
                  maxLength={200}
                  value={selected.owner || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, owner: e.target.value })
                  }
                  placeholder="Nombre o área responsable"
                />
              </Field>
              <Field label="Evidencia y notas de seguimiento" wide>
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={selected.evidence || ""}
                  onChange={(e) =>
                    setSelected({ ...selected, evidence: e.target.value })
                  }
                  placeholder="Identificador del documento, ubicación de la evidencia y observaciones…"
                />
              </Field>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setSelected(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={saving}>
                {saving && <LoaderCircle size={15} className="spin" />}Guardar
                seguimiento
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function PeoplePage({
  company,
  changed,
  notify,
}: {
  company: Company;
  changed: () => void;
  notify: (message: string) => void;
}) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [tab, setTab] = useState<"workers" | "trainings">("workers");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"worker" | "training" | null>(null);
  const [preview, setPreview] = useState<Training | null>(null);
  const [editingWorker, setEditingWorker] = useState<number | null>(null);
  const [worker, setWorker] = useState({
    name: "",
    curp: "",
    position: "",
    department: "",
  });
  const newTraining = () => ({
    title: "",
    instructor: "",
    startDate: "",
    endDate: "",
    hours: 8,
    workerIds: [] as number[],
    area: "Seguridad y salud en el trabajo",
    companyName: company.name,
    companyRfc: company.rfc || "",
  });
  const [training, setTraining] = useState(newTraining);
  async function load() {
    try {
      const [w, t] = await Promise.all([
        api<Worker[]>("/workers"),
        api<Training[]>("/trainings"),
      ]);
      setWorkers(w);
      setTrainings(t);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api(
        modal === "worker"
          ? editingWorker
            ? `/workers/${editingWorker}`
            : "/workers"
          : "/trainings",
        {
          method: modal === "worker" && editingWorker ? "PUT" : "POST",
          body: json(modal === "worker" ? worker : training),
        },
      );
      setModal(null);
      await load();
      changed();
      notify(
        modal === "worker"
          ? editingWorker
            ? "Datos de la persona actualizados."
            : "Persona registrada."
          : "Capacitación y participantes registrados.",
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(kind: "workers" | "trainings", id: number) {
    if (
      !window.confirm(
        `¿Eliminar ${kind === "workers" ? "este registro de persona" : "esta capacitación"}?`,
      )
    )
      return;
    setError("");
    try {
      await api(`/${kind}/${id}`, { method: "DELETE" });
      await load();
      changed();
      notify("Registro eliminado.");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const filtered = workers.filter((item) =>
    `${item.name} ${item.curp} ${item.department}`
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es")),
  );
  function printTraining(course: Training) {
    const people = workers.filter((w) => course.workerIds.includes(w.id));
    if (!people.length) {
      setError("Esta capacitación no tiene participantes disponibles.");
      return;
    }
    const popup = window.open("", "_blank");
    if (!popup) {
      setError(
        "Permite ventanas emergentes para abrir el documento imprimible.",
      );
      return;
    }
    const esc = (value: unknown) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char]!,
      );
    popup.document.write(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Borradores DC-3 · ${esc(course.title)}</title><style>body{font:12px Arial,sans-serif;color:#111;margin:0}article{page-break-after:always;padding:24px;max-width:750px;margin:auto}article:last-child{page-break-after:auto}h1{font-size:20px;text-align:center;margin:14px 0 5px}h2{font-size:13px;background:#eee;padding:9px;border:1px solid #333;margin:20px 0 0}table{width:100%;border-collapse:collapse}td{border:1px solid #333;padding:12px;vertical-align:top;width:50%}small{display:block;margin-bottom:8px;color:#555}strong{font-size:13px}p{line-height:1.5}.notice{border:1px dashed #777;padding:12px;font-size:11px}.signatures{display:flex;gap:28px;margin-top:45px;text-align:center}.signatures div{flex:1;border-top:1px solid #333;padding-top:10px}.toolbar{padding:15px;background:#eee;text-align:center}button{padding:10px 20px;cursor:pointer}@media print{.toolbar{display:none}article{padding:10px}@page{size:A4;margin:15mm}}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / guardar como PDF</button><p>Revisa los datos de cada participante antes de emitir una constancia.</p></div>${people.map((person) => `<article><p style="text-align:right;font-weight:bold">BORRADOR PARA REVISIÓN · DC-3</p><h1>Constancia de competencias o de habilidades laborales</h1><p style="text-align:center">Documento de trabajo generado por Nexo EHS</p><h2>DATOS DE LA PERSONA TRABAJADORA</h2><table><tr><td colspan="2"><small>Nombre</small><strong>${esc(person.name)}</strong></td></tr><tr><td><small>CURP</small><strong>${esc(person.curp || "PENDIENTE DE COMPLETAR")}</strong></td><td><small>Puesto / ocupación</small><strong>${esc(person.position)}</strong></td></tr><tr><td colspan="2"><small>Departamento</small>${esc(person.department)}</td></tr></table><h2>DATOS DE LA EMPRESA</h2><table><tr><td><small>Nombre o razón social</small><strong>${esc(course.companyName)}</strong></td><td><small>RFC</small><strong>${esc(course.companyRfc || "PENDIENTE DE COMPLETAR")}</strong></td></tr></table><h2>DATOS DEL PROGRAMA DE CAPACITACIÓN</h2><table><tr><td colspan="2"><small>Nombre del curso</small><strong>${esc(course.title)}</strong></td></tr><tr><td><small>Duración</small>${esc(course.hours)} horas</td><td><small>Periodo de ejecución</small>${esc(date(course.startDate))} al ${esc(date(course.endDate))}</td></tr><tr><td><small>Área temática</small>${esc(course.area)}</td><td><small>Instructor o agente capacitador</small>${esc(course.instructor)}</td></tr></table><div class="signatures"><div>Instructor / tutor<br><small>Nombre y firma pendientes</small></div><div>Representante del patrón<br><small>Nombre y firma pendientes</small></div><div>Representante de las personas trabajadoras<br><small>Nombre y firma pendientes</small></div></div><p class="notice">BORRADOR: este documento no acredita por sí mismo capacitación ni sustituye el formato oficial vigente. Antes de emitir: cotejar requisitos y catálogos de la STPS; completar claves de ocupación y área temática, datos del agente y representantes, recabar firmas y verificar la evidencia de capacitación. No se han generado firmas ni validaciones oficiales.</p></article>`).join("")}</body></html>`,
    );
    popup.document.close();
  }
  return (
    <>
      <PageHeading
        eyebrow="COMPETENCIAS QUE PROTEGEN"
        title="Personas preparadas. Operación segura."
        description="Conecta a tu equipo con su capacitación y prepara borradores de constancias."
      >
        <button
          className="button secondary"
          onClick={() => {
            setTraining(newTraining());
            setError("");
            setModal("training");
          }}
        >
          <FileCheck2 size={16} />
          Registrar capacitación
        </button>
        <button
          className="button primary"
          onClick={() => {
            setEditingWorker(null);
            setWorker({ name: "", curp: "", position: "", department: "" });
            setError("");
            setModal("worker");
          }}
        >
          <Plus size={17} />
          Agregar persona
        </button>
      </PageHeading>
      <div className="mini-stats">
        <div>
          <Users size={20} />
          <strong>{workers.length}</strong>
          <span>personas registradas</span>
        </div>
        <div>
          <BookOpen size={20} />
          <strong>{trainings.length}</strong>
          <span>capacitaciones registradas</span>
        </div>
        <div>
          <FileCheck2 size={20} />
          <strong>
            {trainings.reduce((sum, item) => sum + item.workerIds.length, 0)}
          </strong>
          <span>participaciones documentadas</span>
        </div>
      </div>
      <ErrorBox error={!modal ? error : ""} />
      <section className="panel">
        <div className="tabs-row">
          <div className="tabs">
            <button
              className={tab === "workers" ? "selected" : ""}
              onClick={() => setTab("workers")}
            >
              Directorio de personas <span>{workers.length}</span>
            </button>
            <button
              className={tab === "trainings" ? "selected" : ""}
              onClick={() => setTab("trainings")}
            >
              Capacitación y DC-3 <span>{trainings.length}</span>
            </button>
          </div>
          {tab === "workers" && (
            <div className="search-field compact">
              <Search size={16} />
              <input
                aria-label="Buscar personas"
                placeholder="Buscar persona…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
        </div>
        {loading ? (
          <div className="loading-inline">
            <LoaderCircle size={20} className="spin" />
            Cargando registros…
          </div>
        ) : tab === "workers" ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Persona trabajadora</th>
                    <th>CURP</th>
                    <th>Puesto</th>
                    <th>Departamento</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((person, i) => (
                    <tr key={person.id}>
                      <td>
                        <div className="person-cell">
                          <span className={`person-avatar avatar-${i % 4}`}>
                            {person.name
                              .split(" ")
                              .map((x) => x[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <strong>{person.name}</strong>
                        </div>
                      </td>
                      <td className="mono">{person.curp}</td>
                      <td>{person.position}</td>
                      <td>{person.department}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            onClick={() => {
                              setEditingWorker(person.id);
                              setWorker({
                                name: person.name,
                                curp: person.curp,
                                position: person.position,
                                department: person.department,
                              });
                              setError("");
                              setModal("worker");
                            }}
                            aria-label={`Editar a ${person.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button danger-hover"
                            onClick={() => void remove("workers", person.id)}
                            aria-label={`Eliminar a ${person.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <Empty icon={Users} title="No hay personas que mostrar">
                Agrega una persona o cambia tu búsqueda.
              </Empty>
            )}
            <div className="table-footer">
              {filtered.length} personas{" "}
              <span>
                Los registros vinculados a capacitaciones se conservan.
              </span>
            </div>
          </>
        ) : (
          <div className="training-list">
            {trainings.length ? (
              trainings.map((course) => (
                <div className="course-card" key={course.id}>
                  <span className="course-icon">
                    <FileCheck2 size={25} />
                  </span>
                  <div className="course-main">
                    <div className="badge-row">
                      <Badge tone="blue">Capacitación registrada</Badge>
                      <span className="course-date">
                        {date(course.endDate)}
                      </span>
                    </div>
                    <h3>{course.title}</h3>
                    <p>{course.instructor}</p>
                    <div className="course-meta">
                      <span>
                        <Users size={14} />
                        {course.workerIds.length} participantes
                      </span>
                      <span>
                        <CalendarDays size={14} />
                        {course.hours} horas
                      </span>
                      <span>{course.area}</span>
                    </div>
                  </div>
                  <div className="course-actions">
                    <button
                      className="button secondary small"
                      onClick={() => setPreview(course)}
                    >
                      <FileText size={15} />
                      Borradores DC-3
                    </button>
                    <button
                      className="icon-button danger-hover"
                      onClick={() => void remove("trainings", course.id)}
                      aria-label={`Eliminar capacitación ${course.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                icon={BookOpen}
                title="Tu primera capacitación empieza aquí"
              >
                Registra un curso, instructor y participantes.
              </Empty>
            )}
          </div>
        )}
      </section>
      {modal && (
        <Modal
          title={
            modal === "worker"
              ? editingWorker
                ? "Editar persona"
                : "Agregar persona"
              : "Registrar capacitación"
          }
          subtitle={
            modal === "worker"
              ? "Completa los datos de la persona trabajadora."
              : "Un curso, sus participantes y la información para las constancias."
          }
          onClose={() => setModal(null)}
          large={modal === "training"}
        >
          <form onSubmit={save}>
            <ErrorBox error={error} />
            {modal === "worker" ? (
              <div className="form-grid">
                <Field label="Nombre completo" wide>
                  <input
                    required
                    value={worker.name}
                    onChange={(e) =>
                      setWorker({ ...worker, name: e.target.value })
                    }
                  />
                </Field>
                <Field label="CURP" wide>
                  <input
                    minLength={18}
                    maxLength={18}
                    pattern="[A-Za-z0-9]{18}"
                    value={worker.curp}
                    onChange={(e) =>
                      setWorker({
                        ...worker,
                        curp: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Opcional · 18 caracteres. Completa antes de emitir DC-3."
                  />
                </Field>
                <Field label="Puesto u ocupación">
                  <input
                    required
                    value={worker.position}
                    onChange={(e) =>
                      setWorker({ ...worker, position: e.target.value })
                    }
                  />
                </Field>
                <Field label="Departamento">
                  <input
                    required
                    value={worker.department}
                    onChange={(e) =>
                      setWorker({ ...worker, department: e.target.value })
                    }
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <Field label="Nombre del curso" wide>
                    <input
                      required
                      value={training.title}
                      onChange={(e) =>
                        setTraining({ ...training, title: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Instructor o agente capacitador">
                    <input
                      required
                      value={training.instructor}
                      onChange={(e) =>
                        setTraining({ ...training, instructor: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Duración en horas">
                    <input
                      required
                      min="1"
                      max="10000"
                      type="number"
                      value={training.hours}
                      onChange={(e) =>
                        setTraining({
                          ...training,
                          hours: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Fecha de inicio">
                    <input
                      required
                      type="date"
                      value={training.startDate}
                      onChange={(e) =>
                        setTraining({ ...training, startDate: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Fecha de término">
                    <input
                      required
                      min={training.startDate}
                      type="date"
                      value={training.endDate}
                      onChange={(e) =>
                        setTraining({ ...training, endDate: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Razón social">
                    <input
                      required
                      value={training.companyName}
                      onChange={(e) =>
                        setTraining({
                          ...training,
                          companyName: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="RFC de la empresa">
                    <input
                      maxLength={13}
                      value={training.companyRfc}
                      onChange={(e) =>
                        setTraining({
                          ...training,
                          companyRfc: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Sin RFC: constancia incompleta"
                    />
                  </Field>
                  <Field label="Área temática" wide>
                    <input
                      required
                      value={training.area}
                      onChange={(e) =>
                        setTraining({ ...training, area: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <h3 className="form-subtitle">
                  Participantes{" "}
                  <span className="muted">
                    ({training.workerIds.length} seleccionados)
                  </span>
                </h3>
                <div className="participant-list">
                  {workers.length ? (
                    workers.map((person) => (
                      <label key={person.id}>
                        <input
                          type="checkbox"
                          checked={training.workerIds.includes(person.id)}
                          onChange={(e) =>
                            setTraining({
                              ...training,
                              workerIds: e.target.checked
                                ? [...training.workerIds, person.id]
                                : training.workerIds.filter(
                                    (id) => id !== person.id,
                                  ),
                            })
                          }
                        />
                        <span>
                          <strong>{person.name}</strong>
                          <small>{person.position}</small>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="muted">
                      Primero registra personas en el directorio.
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={
                  busy || (modal === "training" && !training.workerIds.length)
                }
              >
                {busy && <LoaderCircle size={16} className="spin" />}Guardar
                registro
              </button>
            </div>
          </form>
        </Modal>
      )}
      {preview && (
        <Modal
          title="Preparar borradores DC-3"
          subtitle={preview.title}
          onClose={() => setPreview(null)}
        >
          <div className="document-summary">
            <FileCheck2 size={32} />
            <div>
              <strong>
                {preview.workerIds.length} borradores individuales
              </strong>
              <p>
                {preview.hours} horas · {date(preview.startDate)} al{" "}
                {date(preview.endDate)}
              </p>
            </div>
          </div>
          <div className="notice amber-notice">
            <CircleHelp size={18} />
            <p>
              Se generará una página por participante. Es un borrador para
              revisión: coteja el formato y catálogos STPS vigentes, completa
              claves, datos de representantes y firmas antes de emitir.
            </p>
          </div>
          <div className="participant-list">
            {workers
              .filter((person) => preview.workerIds.includes(person.id))
              .map((person) => (
                <div className="preview-person" key={person.id}>
                  <Check size={15} />
                  <span>
                    {person.name}
                    <small>
                      {person.curp ||
                        "CURP pendiente: completar antes de emitir"}
                    </small>
                  </span>
                </div>
              ))}
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              Cerrar
            </button>
            <button
              className="button primary"
              onClick={() => printTraining(preview)}
            >
              <ArrowDownToLine size={16} />
              Abrir para imprimir / PDF
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function RisksPage({
  notify,
  changed,
}: {
  notify: (message: string) => void;
  changed: () => void;
}) {
  type RiskForm = {
    process: string;
    hazard: string;
    method: string;
    likelihood: number;
    severity: number;
    controls: string;
    guideword: string;
    deviation: string;
    cause: string;
    consequence: string;
    recommendation: string;
  };
  const blank: RiskForm = {
    process: "",
    hazard: "",
    method: "General",
    likelihood: 2,
    severity: 3,
    controls: "",
    guideword: "No",
    deviation: "",
    cause: "",
    consequence: "",
    recommendation: "",
  };
  const [items, setItems] = useState<Risk[]>([]);
  const [form, setForm] = useState<RiskForm>(blank);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function load() {
    try {
      setItems(await api<Risk[]>("/risks"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/risks", { method: "POST", body: json(form) });
      setModal(false);
      await load();
      changed();
      notify("Evaluación de riesgo registrada.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: number) {
    if (!window.confirm("¿Eliminar esta evaluación de riesgo?")) return;
    try {
      await api(`/risks/${id}`, { method: "DELETE" });
      await load();
      changed();
      notify("Evaluación eliminada.");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const score = form.likelihood * form.severity;
  return (
    <>
      <PageHeading
        eyebrow="ANTICIPAR PARA PREVENIR"
        title="Haz visible el riesgo."
        description="Evalúa tus procesos con criterios explícitos y documenta medidas de control."
      >
        <button
          className="button primary"
          onClick={() => {
            setForm(blank);
            setError("");
            setModal(true);
          }}
        >
          <Plus size={17} />
          Nueva evaluación
        </button>
      </PageHeading>
      <div className="risk-intro">
        <div>
          <span className="risk-symbol">
            <HardHat size={26} />
          </span>
          <div>
            <h2>Del peligro a una acción concreta</h2>
            <p>
              Matriz cualitativa 5 × 5 y registro estructurado de desviaciones
              HAZOP.
            </p>
          </div>
        </div>
        <div className="risk-scale">
          <span className="scale-low">1–7 Bajo</span>
          <span className="scale-medium">8–14 Medio</span>
          <span className="scale-high">15–25 Alto</span>
        </div>
      </div>
      <ErrorBox error={!modal ? error : ""} />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Registro de riesgos</h2>
            <p>{items.length} evaluaciones documentadas</p>
          </div>
          <Badge>Probabilidad × Severidad</Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Proceso / peligro identificado</th>
                <th>Método</th>
                <th>Evaluación</th>
                <th>Controles propuestos o existentes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  className="clickable"
                  key={item.id}
                  onClick={() => setSelectedRisk(item)}
                >
                  <td>
                    <div className="table-primary">{item.process}</div>
                    <div className="table-secondary risk-hazard">
                      {item.hazard}
                    </div>
                  </td>
                  <td>
                    <Badge>{item.method}</Badge>
                  </td>
                  <td>
                    <div className="risk-score-cell">
                      <span
                        className={`risk-score ${item.score >= 15 ? "high" : item.score >= 8 ? "medium" : "low"}`}
                      >
                        {item.score}
                      </span>
                      <div>
                        <strong>
                          {item.score >= 15
                            ? "Alto"
                            : item.score >= 8
                              ? "Medio"
                              : "Bajo"}
                        </strong>
                        <small>
                          {item.likelihood} × {item.severity}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td className="controls-cell">{item.controls}</td>
                  <td>
                    <button
                      className="icon-button danger-hover"
                      onClick={(event) => {
                        event.stopPropagation();
                        void remove(item.id);
                      }}
                      aria-label={`Eliminar riesgo ${item.process}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="loading-inline">
            <LoaderCircle className="spin" size={20} />
            Cargando evaluaciones…
          </div>
        )}
        {!loading && !items.length && (
          <Empty icon={HardHat} title="Identifica el primer riesgo">
            Registra el proceso, el peligro y tus medidas de control.
          </Empty>
        )}
      </section>
      <div className="source-disclaimer">
        <CircleHelp size={18} />
        <p>
          La puntuación permite priorizar acciones. El registro HAZOP requiere
          revisión por un equipo competente; no constituye por sí solo un
          estudio completo ni acredita conformidad con ANSI/ASSP o NOM-031.
        </p>
      </div>
      {selectedRisk && (
        <Modal
          title={selectedRisk.process}
          subtitle={`${selectedRisk.method} · Evaluación registrada`}
          onClose={() => setSelectedRisk(null)}
          large
        >
          <div className="risk-detail">
            <div className="score-preview">
              <span>
                Probabilidad {selectedRisk.likelihood} × Severidad{" "}
                {selectedRisk.severity}
              </span>
              <Badge
                tone={
                  selectedRisk.level === "high"
                    ? "red"
                    : selectedRisk.level === "medium"
                      ? "amber"
                      : "green"
                }
              >
                {selectedRisk.score} ·{" "}
                {selectedRisk.level === "high"
                  ? "Alto"
                  : selectedRisk.level === "medium"
                    ? "Medio"
                    : "Bajo"}
              </Badge>
            </div>
            {[
              ["Peligro identificado", selectedRisk.hazard],
              ["Palabra guía", selectedRisk.guideword],
              ["Desviación", selectedRisk.deviation],
              ["Causas", selectedRisk.cause],
              ["Consecuencias", selectedRisk.consequence],
              ["Controles / salvaguardas", selectedRisk.controls],
              ["Recomendaciones", selectedRisk.recommendation],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div className="detail-field" key={label}>
                  <h4>{label}</h4>
                  <p>{value}</p>
                </div>
              ))}
          </div>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={() => setSelectedRisk(null)}
            >
              Cerrar evaluación
            </button>
          </div>
        </Modal>
      )}
      {modal && (
        <Modal
          title="Nueva evaluación de riesgo"
          subtitle="Documenta el contexto, los criterios y las medidas de prevención."
          onClose={() => setModal(false)}
          large
        >
          <form onSubmit={save}>
            <ErrorBox error={error} />
            <div className="form-grid">
              <Field label="Proceso, área o nodo" wide>
                <input
                  required
                  value={form.process}
                  onChange={(e) =>
                    setForm({ ...form, process: e.target.value })
                  }
                  placeholder="Ej. Almacenamiento de sustancias químicas"
                />
              </Field>
              <Field label="Peligro identificado" wide>
                <textarea
                  required
                  rows={2}
                  value={form.hazard}
                  onChange={(e) => setForm({ ...form, hazard: e.target.value })}
                  placeholder="Describe la fuente y el posible daño"
                />
              </Field>
              <Field label="Método de registro" wide>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option>General</option>
                  <option>HAZOP</option>
                  <option>NOM-031</option>
                </select>
              </Field>
              {form.method === "HAZOP" && (
                <>
                  <Field label="Palabra guía">
                    <select
                      value={form.guideword}
                      onChange={(e) =>
                        setForm({ ...form, guideword: e.target.value })
                      }
                    >
                      {[
                        "No",
                        "Más",
                        "Menos",
                        "Además de",
                        "Parte de",
                        "Inverso",
                        "Otro que",
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Desviación">
                    <input
                      required
                      value={form.deviation}
                      onChange={(e) =>
                        setForm({ ...form, deviation: e.target.value })
                      }
                      placeholder="Ej. Ausencia de flujo"
                    />
                  </Field>
                  <Field label="Causas posibles">
                    <textarea
                      required
                      value={form.cause}
                      onChange={(e) =>
                        setForm({ ...form, cause: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Consecuencias">
                    <textarea
                      required
                      value={form.consequence}
                      onChange={(e) =>
                        setForm({ ...form, consequence: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Recomendaciones" wide>
                    <textarea
                      value={form.recommendation}
                      onChange={(e) =>
                        setForm({ ...form, recommendation: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
              <Field label="Probabilidad">
                <select
                  value={form.likelihood}
                  onChange={(e) =>
                    setForm({ ...form, likelihood: Number(e.target.value) })
                  }
                >
                  {[
                    "Rara",
                    "Poco probable",
                    "Posible",
                    "Probable",
                    "Muy probable",
                  ].map((value, i) => (
                    <option value={i + 1} key={value}>
                      {i + 1} · {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severidad">
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm({ ...form, severity: Number(e.target.value) })
                  }
                >
                  {["Menor", "Leve", "Moderada", "Grave", "Catastrófica"].map(
                    (value, i) => (
                      <option value={i + 1} key={value}>
                        {i + 1} · {value}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field
                label="Controles / salvaguardas existentes o propuestos"
                wide
              >
                <textarea
                  required
                  rows={3}
                  value={form.controls}
                  onChange={(e) =>
                    setForm({ ...form, controls: e.target.value })
                  }
                  placeholder="Prioriza eliminación, sustitución e ingeniería; documenta procedimientos y protección personal."
                />
              </Field>
            </div>
            <div className="score-preview">
              <span>Puntuación inicial estimada</span>
              <Badge
                tone={score >= 15 ? "red" : score >= 8 ? "amber" : "green"}
              >
                {form.likelihood} × {form.severity} = {score} ·{" "}
                {score >= 15 ? "Alto" : score >= 8 ? "Medio" : "Bajo"}
              </Badge>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(false)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {busy && <LoaderCircle className="spin" size={16} />}Guardar
                evaluación
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AuditPage({ notify }: { notify: (message: string) => void }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = {
    title: "",
    jurisdiction: "Federal",
    url: "",
    reviewed: false,
    text: "",
    kind: "official" as "official" | "internal",
  };
  const [document, setDocument] = useState(blank);
  const [viewedDocument, setViewedDocument] = useState<Document | null>(null);
  async function load() {
    try {
      setDocuments(await api<Document[]>("/documents"));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function query(event?: FormEvent, preset?: string) {
    event?.preventDefault();
    const text = preset || question;
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    setAsked(text);
    setQuestion(text);
    try {
      setAnswer(
        await api<Answer>("/audit/query", {
          method: "POST",
          body: json({ question: text }),
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/documents", { method: "POST", body: json(document) });
      setModal(false);
      setAnswer(null);
      setAsked("");
      await load();
      notify("Documento incorporado a la base de consulta.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function review(item: Document) {
    try {
      await api(`/documents/${item.id}`, {
        method: "PATCH",
        body: json({ reviewed: !item.reviewed }),
      });
      setAnswer(null);
      setAsked("");
      await load();
      notify(
        item.reviewed
          ? "Documento retirado de las fuentes revisadas."
          : "Revisión del documento registrada.",
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: number) {
    if (!window.confirm("¿Eliminar este documento de la base de consulta?"))
      return;
    try {
      await api(`/documents/${id}`, { method: "DELETE" });
      setAnswer(null);
      setAsked("");
      await load();
      notify("Documento eliminado.");
    } catch (err) {
      setError((err as Error).message);
    }
  }
  const official = documents.filter(
    (item) => item.reviewed && item.kind === "official",
  ).length;
  return (
    <>
      <PageHeading
        eyebrow="LA EVIDENCIA, ANTES QUE LA RESPUESTA"
        title="Tu consultor de auditoría."
        description="Encuentra extractos y referencias en documentos oficiales que tu equipo haya revisado."
      >
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setDocument(blank);
            setError("");
            setModal(true);
          }}
        >
          <Plus size={17} />
          Agregar fuente
        </button>
      </PageHeading>
      <div className="audit-layout">
        <div className="audit-main">
          <section className="panel chat-panel">
            <div className="chat-header">
              <div className="chat-avatar">
                <Sparkles size={22} />
              </div>
              <div>
                <strong>Consulta con evidencia</strong>
                <span>
                  {answer?.mode === "rag"
                    ? "Síntesis con IA sobre fuentes recuperadas"
                    : "Búsqueda documental local · Respuestas extractivas"}
                </span>
              </div>
              <Badge tone="green">{official} fuentes oficiales revisadas</Badge>
            </div>
            <div className="chat-body">
              {!asked ? (
                <div className="chat-welcome">
                  <span className="welcome-icon">
                    <MessageSquareText size={30} />
                  </span>
                  <h2>
                    Una buena respuesta empieza
                    <br />
                    con una fuente verificable.
                  </h2>
                  <p>
                    Consulta tus documentos sobre obligaciones, evidencias y
                    observaciones de inspección. Las respuestas muestran
                    extractos; no inventan fundamentos legales.
                  </p>
                  <div className="suggestions">
                    {[
                      "¿Qué evidencia se requiere para la capacitación de los trabajadores?",
                      "¿Qué obligaciones existen para la prevención de incendios?",
                      "¿Qué documentos respaldan una inspección de seguridad?",
                    ].map((text) => (
                      <button
                        key={text}
                        onClick={() => void query(undefined, text)}
                      >
                        <span>{text}</span>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="conversation">
                  <div className="user-question">
                    <span className="avatar">EH</span>
                    <div>
                      <small>TU CONSULTA</small>
                      <p>{asked}</p>
                    </div>
                  </div>
                  {busy ? (
                    <div className="retrieval-loading">
                      <LoaderCircle className="spin" size={20} />
                      <span>Buscando evidencia en tus fuentes revisadas…</span>
                    </div>
                  ) : (
                    answer && (
                      <div className="answer-block">
                        <div className="answer-label">
                          <Sparkles size={17} />
                          RESULTADO DE LA CONSULTA
                        </div>
                        <p className="answer-text">{answer.answer}</p>
                        {answer.notice && (
                          <div className="answer-note">
                            <CircleHelp size={15} />
                            <span>{answer.notice}</span>
                          </div>
                        )}
                        {answer.warning && (
                          <div className="notice">
                            <TriangleAlert size={16} />
                            <p>{answer.warning}</p>
                          </div>
                        )}
                        {answer.citations.length > 0 && (
                          <>
                            <h4>Fuentes recuperadas</h4>
                            {answer.citations.map((citation, index) => (
                              <div
                                className="citation-card"
                                key={`${citation.id}-${index}`}
                              >
                                <div>
                                  <Badge tone="blue">
                                    Fuente #{citation.id}
                                  </Badge>
                                  <strong>{citation.title}</strong>
                                </div>
                                <blockquote>{citation.excerpt}</blockquote>
                                <div className="citation-footer">
                                  <span>{citation.jurisdiction}</span>
                                  {citation.url && (
                                    <a
                                      href={citation.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Consultar fuente
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                        <div className="answer-note">
                          <CircleHelp size={15} />
                          <span>
                            Verifica vigencia, contexto y aplicabilidad con tu
                            especialista antes de responder a una autoridad.
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
            <ErrorBox error={!modal ? error : ""} />
            <form className="chat-input" onSubmit={query}>
              <textarea
                aria-label="Pregunta para el consultor"
                required
                maxLength={2000}
                rows={2}
                placeholder="Consulta una obligación o una observación del inspector…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy) void query();
                  }
                }}
              />
              <div>
                <span>
                  <ShieldCheck size={13} />
                  Solo evidencia recuperada. Sin afirmaciones legales
                  automáticas.
                </span>
                <button
                  className="send-button"
                  aria-label="Consultar fuentes"
                  disabled={busy || !question.trim()}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
        <aside className="sources-sidebar">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Base de conocimiento</h2>
                <p>{documents.length} documentos registrados</p>
              </div>
              <BookOpen size={19} />
            </div>
            <div className="source-list">
              {documents.length ? (
                documents.map((item) => (
                  <div className="source-item" key={item.id}>
                    <div className="source-item-head">
                      <span className="file-icon">
                        <FileText size={18} />
                      </span>
                      <div>
                        <button
                          className="source-title"
                          onClick={() => setViewedDocument(item)}
                        >
                          {item.title}
                        </button>
                        <small>
                          {item.jurisdiction} ·{" "}
                          {item.kind === "official" ? "Oficial" : "Interno"}
                        </small>
                      </div>
                      <button
                        className="icon-button danger-hover"
                        disabled={busy}
                        onClick={() => void remove(item.id)}
                        aria-label={`Eliminar fuente ${item.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="source-item-bottom">
                      <Badge tone={item.reviewed ? "green" : "amber"}>
                        {item.reviewed
                          ? "Revisado por el equipo"
                          : "Pendiente de revisión"}
                      </Badge>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void review(item)}
                      >
                        {item.reviewed ? "Retirar revisión" : "Marcar revisado"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <Empty icon={BookOpen} title="Agrega tu primera fuente" />
              )}
            </div>
            <button
              className="panel-link"
              disabled={busy}
              onClick={() => {
                setDocument(blank);
                setError("");
                setModal(true);
              }}
            >
              <Plus size={15} />
              Incorporar documento
            </button>
          </section>
          <div className="audit-info">
            <ShieldCheck size={21} />
            <h3>Tú controlas las fuentes</h3>
            <p>
              La consulta jurídica se limita a textos oficiales marcados como
              revisados. El sistema no descarga, certifica ni actualiza
              automáticamente la legislación.
            </p>
            <p>
              Una revisión registrada por tu equipo no equivale a una
              verificación independiente de vigencia.
            </p>
          </div>
        </aside>
      </div>
      {viewedDocument && (
        <Modal
          title={viewedDocument.title}
          subtitle={`${viewedDocument.jurisdiction} · ${viewedDocument.kind === "official" ? "Fuente oficial declarada" : "Documento interno"}`}
          onClose={() => setViewedDocument(null)}
          large
        >
          <div className="document-text-view">
            <div className="badge-row">
              <Badge tone={viewedDocument.reviewed ? "green" : "amber"}>
                {viewedDocument.reviewed
                  ? "Revisión declarada por el equipo"
                  : "Revisión pendiente"}
              </Badge>
              {viewedDocument.url && (
                <a
                  className="text-link"
                  href={viewedDocument.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir fuente original
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <pre>{viewedDocument.text}</pre>
            <p className="document-review-note">
              Coteja el texto completo, fecha, numerales y contexto con la
              fuente original antes de registrar tu revisión. Nexo no verifica
              automáticamente esta declaración.
            </p>
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setViewedDocument(null)}
            >
              Cerrar
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                await review(viewedDocument);
                setViewedDocument(null);
              }}
            >
              {viewedDocument.reviewed
                ? "Retirar revisión"
                : "Registrar revisión del equipo"}
            </button>
          </div>
        </Modal>
      )}
      {modal && (
        <Modal
          title="Incorporar fuente documental"
          subtitle="Pega un extracto fiel y conserva su contexto y referencia."
          onClose={() => setModal(false)}
          large
        >
          <form onSubmit={save}>
            <ErrorBox error={error} />
            <div className="form-grid">
              <Field label="Título del documento" wide>
                <input
                  required
                  value={document.title}
                  onChange={(e) =>
                    setDocument({ ...document, title: e.target.value })
                  }
                  placeholder="Norma, protocolo o disposición"
                />
              </Field>
              <Field label="Tipo de fuente">
                <select
                  value={document.kind}
                  onChange={(e) =>
                    setDocument({
                      ...document,
                      kind: e.target.value as "official" | "internal",
                    })
                  }
                >
                  <option value="official">Documento oficial</option>
                  <option value="internal">Documento interno</option>
                </select>
              </Field>
              <Field label="Ámbito">
                <select
                  value={document.jurisdiction}
                  onChange={(e) =>
                    setDocument({ ...document, jurisdiction: e.target.value })
                  }
                >
                  <option>Federal</option>
                  <option>Jalisco</option>
                  <option>Municipal</option>
                  <option>Interno</option>
                </select>
              </Field>
              <Field label="URL de la fuente" wide>
                <input
                  type="url"
                  required={document.kind === "official"}
                  value={document.url}
                  onChange={(e) =>
                    setDocument({ ...document, url: e.target.value })
                  }
                  placeholder="https://www.dof.gob.mx/…"
                />
              </Field>
              <Field label="Texto o extracto con artículos y numerales" wide>
                <textarea
                  required
                  rows={9}
                  minLength={30}
                  maxLength={100000}
                  value={document.text}
                  onChange={(e) =>
                    setDocument({ ...document, text: e.target.value })
                  }
                  placeholder="Incluye el texto exacto, numerales, fecha y contexto suficientes. El buscador consultará este contenido, no la URL."
                />
              </Field>
            </div>
            <label className="review-checkbox">
              <input
                type="checkbox"
                checked={document.reviewed}
                onChange={(e) =>
                  setDocument({ ...document, reviewed: e.target.checked })
                }
              />
              <span>
                Mi equipo cotejó este extracto con la fuente y revisó su
                vigencia y contexto.
                <small>
                  Solo las fuentes oficiales revisadas se usan en consultas
                  jurídicas.
                </small>
              </span>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(false)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={saving || busy}>
                {saving && <LoaderCircle className="spin" size={16} />}Guardar
                fuente
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
