import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Upload,
  Plus,
  FolderOpen,
  LayoutDashboard,
  Settings as SettingsIcon,
  Cloud,
  ArrowUpRight,
  ArrowLeft,
  Copy,
  Trash2,
  Search,
  CheckCircle2,
  CircleHelp,
  X,
  Download,
  PanelsTopLeft,
  Scissors,
  ClipboardList,
  FileText,
  AlertTriangle,
  Hammer,
} from "lucide-react";
import type { CloudConfig, Project, Settings } from "./types";
import { defaults, newProject, uid } from "./defaults";
import { calculate } from "./engine";
import {
  loadDefaults,
  loadMeta,
  loadProjects,
  loadFile,
  removeProject,
  saveDefaults,
  saveFile,
  saveMeta,
  saveProject,
} from "./storage";
import { projectSchema } from "./schema";
import { parseCSV } from "./imports";
import { exportJSON } from "./exports";
import { FurnitureBuilder, FurnitureView } from "./components/Furniture";
import { Reference } from "./components/Reference";
import { buildFurniture } from "./furniture";
import { Pieces } from "./components/Pieces";
import { MaterialSettings, Materials } from "./components/Materials";
import { Cuts } from "./components/Cuts";
import { Budget, LaborFields } from "./components/Budget";
import { Files } from "./components/Files";
import { Cloud as CloudPanel } from "./components/Cloud";
import { PrintReport } from "./components/PrintReport";
import { Empty, Field } from "./components/Fields";
type View = "home" | "projects" | "editor" | "settings" | "cloud" | "help";
type Tab = "files" | "pieces" | "materials" | "plan" | "budget";
let saveQueue: Promise<unknown> = Promise.resolve();
export default function App() {
  const [projects, setProjects] = useState<Project[]>([]),
    [settings, setSettings] = useState<Settings>(defaults),
    [cloud, setCloud] = useState<CloudConfig>({
      url: import.meta.env.VITE_SUPABASE_URL ?? "",
      key: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    });
  const [view, setView] = useState<View>("home"),
    [tab, setTab] = useState<Tab>("files"),
    [selected, setSelected] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState(""),
    [toast, setToast] = useState(""),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(false),
    [search, setSearch] = useState("");
  const [planTab, setPlanTab] = useState<"furniture" | "cuts">("furniture");
  const fileInput = useRef<HTMLInputElement>(null),
    cameraInput = useRef<HTMLInputElement>(null),
    backupInput = useRef<HTMLInputElement>(null);
  const project = projects.find((p) => p.id === selected),
    result = useMemo(
      () => (project ? calculate(project) : undefined),
      [project],
    );
  const notify = (s: string) => setToast(s);
  useEffect(() => {
    void Promise.all([
      loadProjects(),
      loadDefaults(),
      loadMeta<CloudConfig>("cloud"),
    ])
      .then(([p, s, c]) => {
        setProjects(p);
        if (s) setSettings(s);
        if (c) setCloud(c);
        setReady(true);
      })
      .catch((e) =>
        setLoadError(
          `No se pudieron leer los datos locales: ${String(e)}. No borres los datos del navegador; probá recargar.`,
        ),
      );
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 9000);
    return () => clearTimeout(timer);
  }, [toast]);
  const persist = (p: Project) => {
    setSaving(true);
    saveQueue = saveQueue.catch(() => {}).then(() => saveProject(p));
    const current = saveQueue;
    void current
      .then(() => {
        if (saveQueue === current) {
          setSaving(false);
          setSaveError(false);
        }
      })
      .catch(() => {
        setSaving(false);
        setSaveError(true);
        notify(
          "No se pudo guardar. Puede faltar espacio en el dispositivo. Exportá una copia JSON antes de cerrar.",
        );
      });
  };
  const receive = (p: Project) => {
    setProjects((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
    persist(p);
  };
  const update = (p: Project, confirmedConstruction = false) => {
    const old = projects.find((x) => x.id === p.id);
    const geometry = (v: Project) =>
      JSON.stringify([
        v.pieces,
        v.offcuts,
        v.settings.kerf,
        v.settings.margin,
        v.settings.materials.map((m) => [
          m.id,
          m.length,
          m.width,
          m.thickness,
          m.grain,
        ]),
      ]);
    const changed = old && geometry(old) !== geometry(p);
    receive({
      ...p,
      status: changed ? "draft" : p.status,
      furniture: changed && !confirmedConstruction ? undefined : p.furniture,
      reviewed: changed ? confirmedConstruction : p.reviewed,
      updatedAt: new Date().toISOString(),
    });
  };
  const navigate = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };
  const open = (p: Project, initialTab: Tab = "pieces") => {
    setSelected(p.id);
    setTab(initialTab);
    navigate("editor");
  };
  const create = (demo = false) => {
    const p = newProject(settings);
    if (demo) {
      p.name = "Estantería del living";
      p.client = "Proyecto de ejemplo";
      const m = settings.materials[0];
      if (m) {
        p.furniture = {
          width: 1200,
          height: 800,
          depth: 300,
          shelves: 1,
          shelfSetback: 20,
          materialId: m.id,
        };
        p.pieces = buildFurniture(p.furniture, m);
        p.reviewed = true;
      }
    }
    receive(p);
    open(p, demo ? "plan" : "pieces");
    return p;
  };
  const duplicate = async (p: Project) => {
    try {
      const copy = structuredClone(p);
      copy.id = uid();
      copy.name += " (copia)";
      copy.status = "draft";
      copy.createdAt = copy.updatedAt = new Date().toISOString();
      for (const a of copy.attachments) {
        const file = await loadFile(a.id);
        a.id = uid();
        if (file) {
          await saveFile(a.id, file);
          delete a.storagePath;
        }
      }
      receive(copy);
      open(copy);
      notify("Copia creada.");
    } catch (e) {
      notify(`No se pudo duplicar: ${String(e)}`);
    }
  };
  const remove = async (p: Project) => {
    if (
      !confirm(
        `¿Eliminar «${p.name}» de este dispositivo? La copia de la nube se conserva.`,
      )
    )
      return;
    try {
      await saveQueue.catch(() => {});
      await removeProject(p.id);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      if (selected === p.id) setSelected(null);
    } catch (e) {
      notify(String(e));
    }
  };
  const upload = async (files: FileList, target?: Project) => {
    try {
      const incoming = Array.from(files);
      if (incoming.some((f) => f.size > 25 * 1024 * 1024))
        throw new Error("Cada archivo puede pesar como máximo 25 MB.");
      const p = structuredClone(target ?? project ?? newProject(settings));
      if (p.attachments.length + incoming.length > 100)
        throw new Error("El límite es de 100 archivos por proyecto.");
      if (!target && !project && incoming[0])
        p.name = incoming[0].name.replace(/\.[^.]+$/, "");
      for (const file of incoming) {
        const id = uid();
        if (/\.csv$/i.test(file.name))
          p.pieces.push(...parseCSV(await file.text(), p.settings));
        await saveFile(id, file);
        p.attachments.push({
          id,
          name: file.name,
          type:
            file.type ||
            (/\.pdf$/i.test(file.name)
              ? "application/pdf"
              : "application/octet-stream"),
          size: file.size,
        });
      }
      update(p);
      open(p, "pieces");
      notify(
        "Archivos guardados. Copiá y confirmá las medidas junto al plano original.",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    }
  };
  const importBackup = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("El respaldo excede 10 MB.");
      const p = projectSchema.parse(JSON.parse(await file.text()));
      p.id = uid();
      p.name += " (importado)";
      p.reviewed = false;
      p.status = "draft";
      p.createdAt = p.updatedAt = new Date().toISOString();
      receive(p);
      open(p);
      notify(
        "Datos importados. Los archivos originales se recuperan desde la nube o se adjuntan por separado.",
      );
    } catch (e) {
      notify(
        `No se pudo importar el respaldo: ${e instanceof Error ? e.message.slice(0, 220) : String(e)}`,
      );
    }
  };
  const changeDefaults = (s: Settings) => {
    setSettings(s);
    void saveDefaults(s).catch(() =>
      notify("No se pudieron guardar los ajustes."),
    );
  };
  const filtered = [...projects]
    .filter((p) =>
      `${p.name} ${p.client}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const cards = (list: Project[]) => (
    <div className="project-grid">
      {list.map((p, i) => {
        const c = calculate(p);
        return (
          <article className="project-card" key={p.id}>
            <button
              className={`project-visual variant-${i % 3}`}
              onClick={() => open(p)}
              aria-label={`Abrir ${p.name}`}
            >
              <div className="cabinet-drawing">
                <span />
                <span />
                <span />
              </div>
              <span className={`status ${p.status}`}>
                {p.status === "approved"
                  ? "Aprobado"
                  : p.status === "quoted"
                    ? "Presupuestado"
                    : "Borrador"}
              </span>
              <span className="project-arrow">
                <ArrowUpRight size={20} />
              </span>
            </button>
            <div className="project-body">
              <button className="title-button" onClick={() => open(p)}>
                {p.name}
              </button>
              <p>
                {p.client || "Sin cliente"}{" "}
                <span>
                  · {new Date(p.updatedAt).toLocaleDateString("es-AR")}
                </span>
              </p>
              <div className="project-meta">
                <span>{c.totalPieces} piezas</span>
                <span>
                  {p.reviewed ? "Medidas revisadas" : "Pendiente de revisión"}
                </span>
              </div>
              <div className="project-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    void duplicate(p);
                  }}
                >
                  <Copy size={14} /> Duplicar
                </button>
                <button
                  className="icon danger"
                  aria-label={`Eliminar proyecto ${p.name}`}
                  onClick={() => {
                    void remove(p);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
  if (loadError)
    return (
      <main className="fatal">
        <h1>No pudimos abrir tu taller.</h1>
        <p>{loadError}</p>
        <button onClick={() => location.reload()}>Recargar</button>
      </main>
    );
  if (!ready)
    return (
      <main className="fatal">
        <Hammer size={32} />
        <h1>Abriendo el taller…</h1>
      </main>
    );
  return (
    <>
      <div className="outer-caption">
        <strong>Carpintería Tomi</strong>
        <span>Tu taller, más simple.</span>
      </div>
      <div className="app-shell">
        <div className="main-wrap">
          <header className="simple-header">
            <a
              className="simple-brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("home");
              }}
            >
              tomi.<small>CARPINTERÍA</small>
            </a>
            <nav aria-label="Menú principal">
              {(
                [
                  { id: "home", label: "Inicio", icon: LayoutDashboard },
                  { id: "projects", label: "Mis proyectos", icon: FolderOpen },
                  { id: "help", label: "Ayuda", icon: CircleHelp },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  aria-current={view === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={17} />
                  {item.label}
                </button>
              ))}
            </nav>
          </header>
          <main className="main-content">
            {view === "home" && (
              <>
                <h1>¿Qué vamos a construir?</h1>
                <p className="home-sub">
                  Empezá con una foto o un plano. Te acompañamos paso a paso.
                </p>
                <div className="home-grid">
                  <section className="card start-options">
                    <button
                      className="start-button primary"
                      onClick={() => cameraInput.current?.click()}
                    >
                      <span className="symbol">
                        <Camera size={24} />
                      </span>
                      <span>
                        <strong>Sacar foto del plano</strong>
                        <small>Usá un dibujo o croquis en papel</small>
                      </span>
                      <ArrowUpRight size={21} />
                    </button>
                    <button
                      className="start-button"
                      onClick={() => fileInput.current?.click()}
                    >
                      <span className="symbol">
                        <Upload size={24} />
                      </span>
                      <span>
                        <strong>Subir un plano</strong>
                        <small>Elegí un archivo que ya tengas</small>
                      </span>
                      <ArrowUpRight size={21} />
                    </button>
                    <button className="manual-start" onClick={() => create()}>
                      No tengo plano · Ingresar medidas
                    </button>
                    <small>
                      Si no se abre la cámara, elegí una foto desde Subir un
                      plano.
                    </small>
                  </section>
                  <aside className="card recent-panel">
                    <h2>
                      <FolderOpen size={18} /> Seguí donde quedaste
                    </h2>
                    {projects.length ? (
                      cards(filtered.slice(0, 1))
                    ) : (
                      <div className="example-card">
                        <span className="badge">
                          <CheckCircle2 size={13} /> Ejemplo listo para ver
                        </span>
                        <div className="mini-drawing">
                          <div className="mini-cabinet" />
                        </div>
                        <h3>Estantería del living</h3>
                        <p>Melamina blanca · 18 mm</p>
                        <button onClick={() => create(true)}>
                          Ver plano de ejemplo <ArrowUpRight size={18} />
                        </button>
                      </div>
                    )}
                  </aside>
                </div>
                <div className="home-note">
                  <CheckCircle2 size={17} />
                  Primero revisás las medidas. Después calculamos los
                  materiales.
                </div>
              </>
            )}
            {view === "projects" && (
              <>
                <div className="section-title">
                  <div>
                    <span className="eyebrow">TU HISTORIAL DE TRABAJO</span>
                    <h1>Mis proyectos</h1>
                    <p>Cada idea, cada medida y cada presupuesto.</p>
                  </div>
                  <div className="actions">
                    <button onClick={() => backupInput.current?.click()}>
                      <Upload size={17} /> Importar respaldo
                    </button>
                    <button className="primary" onClick={() => create()}>
                      <Plus size={18} /> Nuevo proyecto
                    </button>
                  </div>
                </div>
                <label className="search">
                  <Search size={20} />
                  <input
                    aria-label="Buscar proyectos"
                    placeholder="Buscar por proyecto o cliente…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                {filtered.length ? (
                  cards(filtered)
                ) : (
                  <Empty
                    title={
                      search
                        ? "No encontramos ese proyecto"
                        : "Tu mesa de trabajo está lista"
                    }
                  >
                    <p>
                      {search
                        ? "Probá con otro nombre."
                        : "Creá un proyecto o cargá un ejemplo para empezar."}
                    </p>
                    {!search && (
                      <button onClick={() => create(true)}>
                        Explorar ejemplo
                      </button>
                    )}
                  </Empty>
                )}
              </>
            )}
            {view === "editor" && project && result && (
              <>
                <button
                  className="text-button back-link"
                  onClick={() => navigate("projects")}
                >
                  <ArrowLeft size={17} /> Mis proyectos
                </button>
                <div className="editor-heading">
                  <div>
                    <input
                      className="project-title"
                      aria-label="Nombre del proyecto"
                      value={project.name}
                      onChange={(e) =>
                        update({ ...project, name: e.target.value })
                      }
                    />
                    <input
                      className="client-input"
                      aria-label="Cliente"
                      placeholder="Agregar nombre del cliente"
                      value={project.client}
                      onChange={(e) =>
                        update({ ...project, client: e.target.value })
                      }
                    />
                  </div>
                  <div className="actions">
                    <button
                      title="Respaldo de datos; los originales se guardan por separado"
                      onClick={() => exportJSON(project)}
                    >
                      <Download size={17} /> Respaldo JSON
                    </button>
                    <button onClick={() => navigate("cloud")}>
                      <Cloud size={18} /> Sincronizar
                    </button>
                  </div>
                </div>
                <div className="review-status">
                  <span className="badge">
                    {project.reviewed
                      ? "Medidas revisadas"
                      : "Medidas pendientes de confirmar"}
                  </span>
                  <small>
                    {saveError
                      ? "Error al guardar: exportá un respaldo"
                      : saving
                        ? "Guardando…"
                        : "Guardado en este dispositivo"}
                  </small>
                </div>
                <nav className="tabs" aria-label="Secciones del proyecto">
                  {(
                    [
                      { id: "files", label: "Archivos", icon: FileText },
                      {
                        id: "pieces",
                        label: "Revisar medidas",
                        icon: ClipboardList,
                      },
                      {
                        id: "materials",
                        label: "Materiales",
                        icon: PanelsTopLeft,
                      },
                      { id: "plan", label: "Ver plano", icon: Scissors },
                      { id: "budget", label: "Presupuesto", icon: FileText },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      className={tab === t.id ? "active" : ""}
                      onClick={() => setTab(t.id)}
                    >
                      <t.icon size={18} />
                      {t.label}
                    </button>
                  ))}
                </nav>
                {result.errors.length > 0 && (
                  <div className="notice error" role="alert">
                    <AlertTriangle size={20} />
                    <div>
                      <strong>Faltan datos para completar el cálculo.</strong>
                      <ul>
                        {result.errors.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {result.warnings.map((w) => (
                  <div className="notice warning" key={w}>
                    <AlertTriangle size={18} />
                    {w}
                  </div>
                ))}
                {tab === "files" && (
                  <Files
                    project={project}
                    update={update}
                    upload={(f) => {
                      void upload(f, project);
                    }}
                    cloud={cloud}
                    notify={notify}
                  />
                )}{" "}
                {tab === "pieces" && (
                  <>
                    <FurnitureBuilder
                      key={project.id}
                      project={project}
                      update={(p) => update(p, true)}
                      notify={notify}
                    />
                    <div
                      className={
                        project.attachments.length ? "review-layout" : ""
                      }
                    >
                      <Reference attachments={project.attachments} />
                      <Pieces
                        project={project}
                        update={(p) =>
                          update({
                            ...p,
                            furniture: undefined,
                            reviewed: false,
                          })
                        }
                      />
                    </div>
                    <div className="confirmation-bar">
                      <p>
                        {project.reviewed
                          ? "Medidas confirmadas. Podés continuar al plano digital."
                          : "Compará cada pieza con el original: medidas, cantidades, materiales, espesor, veta y cantos."}
                      </p>
                      <button
                        className="primary"
                        disabled={
                          !project.pieces.length || !!result.errors.length
                        }
                        onClick={() => {
                          update({ ...project, reviewed: true });
                          setPlanTab("furniture");
                          setTab("plan");
                        }}
                      >
                        Confirmar medidas y ver plano <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </>
                )}{" "}
                {tab === "materials" && (
                  <Materials project={project} update={update} />
                )}{" "}
                {tab === "plan" &&
                  (project.reviewed ? (
                    <>
                      <div className="plan-tabs">
                        <button
                          className={planTab === "furniture" ? "primary" : ""}
                          onClick={() => setPlanTab("furniture")}
                        >
                          Ver mueble
                        </button>
                        <button
                          className={planTab === "cuts" ? "primary" : ""}
                          onClick={() => setPlanTab("cuts")}
                        >
                          Cortes y uso de placa
                        </button>
                      </div>
                      {planTab === "furniture" ? (
                        <FurnitureView project={project} />
                      ) : (
                        <Cuts
                          project={project}
                          result={result}
                          notify={notify}
                        />
                      )}
                      <div className="step-actions">
                        <button onClick={() => setTab("pieces")}>
                          Corregir medidas
                        </button>
                        <button
                          className="primary"
                          onClick={() => setTab("budget")}
                        >
                          Ver presupuesto <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <Empty title="Primero revisemos las medidas">
                      <p>Confirmá los datos para generar el plano digital.</p>
                      <button
                        className="primary"
                        onClick={() => setTab("pieces")}
                      >
                        Revisar medidas
                      </button>
                    </Empty>
                  ))}{" "}
                {tab === "budget" &&
                  (project.reviewed ? (
                    <Budget project={project} result={result} update={update} />
                  ) : (
                    <Empty title="Confirmá las medidas antes de presupuestar">
                      <button
                        className="primary"
                        onClick={() => setTab("pieces")}
                      >
                        Revisar medidas
                      </button>
                    </Empty>
                  ))}
                <details className="project-notes">
                  <summary>Notas del proyecto</summary>
                  <Field label="Notas y condiciones">
                    <textarea
                      rows={4}
                      placeholder="Entrega, instalación, condiciones del presupuesto…"
                      value={project.notes}
                      onChange={(e) =>
                        update({ ...project, notes: e.target.value })
                      }
                    />
                  </Field>
                </details>
              </>
            )}
            {view === "help" && (
              <>
                <h1>Un paso a la vez</h1>
                <p>No necesitás saber de programas de diseño.</p>
                <div className="help-grid">
                  <div className="card">
                    <h2>1. Cargá tu plano</h2>
                    <p>
                      Sacá una foto de frente, con buena luz y las medidas
                      legibles. También podés ingresarlas a mano.
                    </p>
                  </div>
                  <div className="card">
                    <h2>2. Revisá los datos</h2>
                    <p>
                      Copiá las medidas del original. Completá material, espesor
                      y cantos. Confirmá los datos antes de seguir.
                    </p>
                  </div>
                  <div className="card">
                    <h2>3. Mirá el resultado</h2>
                    <p>
                      Revisá el mueble, los cortes y el presupuesto. Podés
                      volver y corregir las medidas cuando quieras.
                    </p>
                  </div>
                </div>
                <div className="card space-top">
                  <h3>Tu taller, a tu manera</h3>
                  <p>
                    Los proyectos se guardan en este dispositivo. Para verlos
                    desde otros dispositivos, conectá una cuenta de Supabase. La
                    versión local funciona sin registro ni IA paga.
                  </p>
                  <div className="actions">
                    <button onClick={() => navigate("settings")}>
                      <SettingsIcon size={18} /> Materiales y precios habituales
                    </button>
                    <button onClick={() => navigate("cloud")}>
                      <Cloud size={18} /> Nube y cuenta
                    </button>
                    <button onClick={() => backupInput.current?.click()}>
                      <Upload size={18} /> Importar respaldo JSON
                    </button>
                  </div>
                </div>
                <div className="card space-top">
                  <h3>Archivos y exportaciones</h3>
                  <p>
                    Las fotos y los PDF se muestran junto a las medidas. Los CSV
                    importan piezas en milímetros. DWG, DXF, Excel, Word y otros
                    archivos se guardan como referencia, con carga manual.
                  </p>
                  <p>
                    PDF usa el diálogo de impresión: elegí Guardar como PDF. CSV
                    se abre en Excel. Los planos se exportan como PNG y SVG. El
                    respaldo JSON contiene los datos; los archivos originales se
                    guardan por separado o en Supabase.
                  </p>
                  <p>
                    El optimizador distingue placas por superficie y placas
                    según cortes. Los sobrantes son rectángulos libres; el
                    aserrín y los márgenes se contabilizan aparte.
                  </p>
                </div>
              </>
            )}
            {view === "settings" && (
              <>
                <MaterialSettings
                  settings={settings}
                  onChange={changeDefaults}
                />
                <div className="card space-top">
                  <h3>Valores de mano de obra y ganancia</h3>
                  <LaborFields
                    costs={settings.costs}
                    currency={settings.currency}
                    onChange={(costs) => changeDefaults({ ...settings, costs })}
                  />
                </div>
                <div className="notice space-top">
                  Estos valores se aplican a los proyectos nuevos. Cada proyecto
                  conserva sus materiales y precios; los podés editar dentro de
                  Materiales y Presupuesto.
                </div>
              </>
            )}
            {view === "cloud" && (
              <CloudPanel
                config={cloud}
                configure={(c) => {
                  setCloud(c);
                  void saveMeta("cloud", c).catch((e) => notify(String(e)));
                }}
                project={project}
                projects={projects}
                receive={receive}
                notify={notify}
              />
            )}
          </main>
          <footer className="app-footer">
            <span>Tu taller, más simple.</span>
            <div>
              <button
                className="text-button"
                onClick={() => navigate("settings")}
              >
                Mi taller
              </button>
              <button className="text-button" onClick={() => navigate("cloud")}>
                Nube y cuenta
              </button>
            </div>
            <span>
              {saveError
                ? "Error al guardar"
                : saving
                  ? "Guardando…"
                  : "Guardado local · Sin cuenta obligatoria"}
            </span>
          </footer>
        </div>
      </div>
      <input
        hidden
        type="file"
        multiple
        ref={fileInput}
        aria-label="Subir archivos"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files, newProject(settings));
          e.target.value = "";
        }}
      />
      <input
        hidden
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInput}
        aria-label="Fotografiar plano"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files, newProject(settings));
          e.target.value = "";
        }}
      />
      <input
        hidden
        type="file"
        accept=".json,application/json"
        ref={backupInput}
        onChange={(e) => {
          if (e.target.files?.[0]) void importBackup(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon"
            aria-label="Cerrar aviso"
            onClick={() => setToast("")}
          >
            <X size={19} />
          </button>
        </div>
      )}
      {project && result && <PrintReport project={project} result={result} />}
    </>
  );
}
