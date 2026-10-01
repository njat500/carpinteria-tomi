import { useEffect, useState } from "react";
import {
  CloudUpload,
  CloudDownload,
  RefreshCw,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import type { CloudConfig, Project } from "../types";
import { cloudClient, listCloud, pullCloud, pushCloud } from "../cloud";
import { Field } from "./Fields";
export function Cloud({
  config,
  configure,
  project,
  projects,
  receive,
  notify,
}: {
  config: CloudConfig;
  configure: (c: CloudConfig) => void;
  project?: Project;
  projects: Project[];
  receive: (p: Project) => void;
  notify: (s: string) => void;
}) {
  const [draft, setDraft] = useState(config),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [user, setUser] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [remote, setRemote] = useState<Awaited<ReturnType<typeof listCloud>>>([]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String(e.message)
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!config.url || !config.key) {
      setUser(null);
      return;
    }
    try {
      const client = cloudClient(config);
      void client.auth
        .getSession()
        .then(({ data }) => setUser(data.session?.user.email ?? null));
      const { data } = client.auth.onAuthStateChange((_e, session) =>
        setUser(session?.user.email ?? null),
      );
      return () => data.subscription.unsubscribe();
    } catch {
      setUser(null);
    }
  }, [config.url, config.key]);
  const refresh = async () => setRemote(await listCloud(config));
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">TU TALLER, DONDE ESTÉS</span>
          <h1>Proyectos en la nube.</h1>
          <p>
            Usá la misma cuenta desde el celular, la tablet y la computadora.
          </p>
        </div>
        <span className="badge">
          <ShieldCheck size={15} /> Archivos privados
        </span>
      </div>
      <div className="notice">
        El guardado local es automático. Para compartir cambios entre
        dispositivos, usá Subir y Descargar. Si dos dispositivos modifican el
        mismo proyecto, la app avisa antes de sobrescribir.
      </div>
      <div className="cloud-grid">
        <div className="card">
          <h3>1. Conectar Supabase</h3>
          <p className="muted">
            Creá el proyecto, ejecutá el SQL de instalación y pegá la URL y la
            clave pública. Encontrarás los pasos en el README del repositorio.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                cloudClient(draft);
                configure(draft);
                setRemote([]);
                notify("Conexión guardada. Ahora iniciá sesión.");
              } catch (error) {
                notify(String(error));
              }
            }}
          >
            <Field label="URL del proyecto Supabase">
              <input
                type="url"
                placeholder="https://tu-proyecto.supabase.co"
                value={draft.url}
                required
                onChange={(e) =>
                  setDraft({ ...draft, url: e.target.value.trim() })
                }
              />
            </Field>
            <Field
              label="Clave pública publishable / anon"
              hint="Nunca ingreses service_role, una clave secreta ni la clave de OpenAI aquí."
            >
              <input
                placeholder="sb_publishable_…"
                value={draft.key}
                required
                onChange={(e) =>
                  setDraft({ ...draft, key: e.target.value.trim() })
                }
              />
            </Field>
            <button className="primary" type="submit">
              Guardar conexión
            </button>
          </form>
        </div>
        <div className="card">
          <h3>2. Tu cuenta</h3>
          {user ? (
            <>
              <p className="connected-dot">Conectado como {user}</p>
              <button
                onClick={() => {
                  void run(async () => {
                    const { error } = await cloudClient(config).auth.signOut();
                    if (error) throw error;
                    setRemote([]);
                  });
                }}
              >
                <LogOut size={17} /> Cerrar sesión
              </button>
              <p className="muted">
                Cerrar sesión no elimina los proyectos guardados en este
                dispositivo.
              </p>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const { error } = await cloudClient(
                    config,
                  ).auth.signInWithPassword({ email, password });
                  if (error) throw error;
                  setPassword("");
                  notify("Sesión iniciada.");
                });
              }}
            >
              <Field label="Correo electrónico">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Contraseña">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <div className="actions">
                <button
                  className="primary"
                  type="submit"
                  disabled={busy || !config.url || !config.key}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  disabled={
                    busy ||
                    !config.url ||
                    !config.key ||
                    !email ||
                    password.length < 8
                  }
                  onClick={() => {
                    void run(async () => {
                      const { data, error } = await cloudClient(
                        config,
                      ).auth.signUp({
                        email,
                        password,
                        options: { emailRedirectTo: location.origin },
                      });
                      if (error) throw error;
                      notify(
                        data.session
                          ? "Cuenta creada y sesión iniciada."
                          : "Revisá tu correo para confirmar la cuenta y después iniciá sesión.",
                      );
                    });
                  }}
                >
                  Crear cuenta
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="card space-top">
        <div className="section-title">
          <div>
            <h3>3. Sincronizar proyectos</h3>
            <p>
              {project
                ? `Proyecto abierto: ${project.name}`
                : "Abrí un proyecto para subirlo a la nube."}
            </p>
          </div>
          <div className="actions">
            <button
              disabled={!user || busy || !project}
              onClick={() => {
                if (project)
                  void run(async () => {
                    const p = await pushCloud(config, project);
                    receive(p);
                    await refresh();
                    notify("Proyecto y archivos guardados en Supabase.");
                  });
              }}
            >
              <CloudUpload size={18} /> Subir proyecto abierto
            </button>
            <button
              disabled={!user || busy}
              onClick={() => {
                void run(refresh);
              }}
            >
              <RefreshCw size={17} /> Actualizar lista
            </button>
          </div>
        </div>
        {busy && <p role="status">Conectando…</p>}
        {remote.map((p) => (
          <div className="cloud-project" key={p.id}>
            <div>
              <strong>{p.name}</strong>
              <span>
                {new Date(p.updated_at).toLocaleString("es-AR")} · versión{" "}
                {p.revision}
              </span>
            </div>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  projects.some((x) => x.id === p.id) &&
                  !confirm(
                    "La descarga reemplaza la versión local. Si tenés cambios sin subir, cancelá y duplicá tu proyecto para conservarlos. ¿Continuar?",
                  )
                )
                  return;
                void run(async () => {
                  receive(await pullCloud(config, p.id));
                  notify("Proyecto descargado con sus archivos.");
                });
              }}
            >
              <CloudDownload size={17} /> Descargar
            </button>
          </div>
        ))}
        {!remote.length && (
          <p className="muted">
            Iniciá sesión y actualizá la lista para ver los proyectos guardados
            en la nube.
          </p>
        )}
      </div>
      <div className="notice space-top">
        Para leer planos con GPT, desplegá la función <code>analyze-plan</code>{" "}
        y configurá la clave del proveedor en los secretos del servidor. La
        imagen solo se envía al tocar «Leer plano» y puede generar un costo en
        tu cuenta de API.
      </div>
    </>
  );
}
