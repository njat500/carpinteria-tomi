import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CloudConfig, Project } from "./types";
import { projectSchema } from "./schema";
import { loadFile, loadMeta, saveFile, saveMeta } from "./storage";
let cached: { signature: string; client: SupabaseClient } | undefined;
export function cloudClient(config: CloudConfig) {
  const parsed = new URL(config.url);
  if (
    parsed.protocol !== "https:" &&
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1"
  )
    throw new Error("Supabase requiere una URL HTTPS.");
  if (!config.key.trim())
    throw new Error("Completá la clave pública de Supabase.");
  if (config.key.startsWith("sb_secret_"))
    throw new Error(
      "Usá la clave pública publishable o anon, nunca una clave secreta.",
    );
  try {
    const payload = JSON.parse(atob(config.key.split(".")[1] ?? ""));
    if (payload.role === "service_role") throw new Error("service_role");
  } catch (error) {
    if (error instanceof Error && error.message === "service_role")
      throw new Error("La clave service_role es privada. Usá la clave anon.");
  }
  const signature = `${config.url}:${config.key}`;
  if (cached?.signature === signature) return cached.client;
  cached = { signature, client: createClient(config.url, config.key) };
  return cached.client;
}
export async function listCloud(config: CloudConfig) {
  const { data, error } = await cloudClient(config)
    .from("projects")
    .select("id,name,updated_at,revision")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as {
    id: string;
    name: string;
    updated_at: string;
    revision: number;
  }[];
}
async function identity(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("Iniciá sesión para usar la nube.");
  return data.user.id;
}
const revisionKey = (url: string, user: string, id: string) =>
  `revision:${url}:${user}:${id}`;
export async function pushCloud(config: CloudConfig, project: Project) {
  const client = cloudClient(config),
    user = await identity(client),
    p = structuredClone(project);
  const key = revisionKey(config.url, user, p.id),
    revision = await loadMeta<number>(key);
  const { data: existing, error: checkError } = await client
    .from("projects")
    .select("revision")
    .eq("id", p.id)
    .maybeSingle();
  if (checkError) throw checkError;
  if (existing && existing.revision !== revision)
    throw new Error(
      "Hay otra versión en la nube. Duplicá tu proyecto para conservar tus cambios y descargá la versión remota antes de sincronizar.",
    );
  for (const attachment of p.attachments) {
    const blob = await loadFile(attachment.id);
    const path = `${user}/${p.id}/${attachment.id}`;
    if (blob) {
      const { error } = await client.storage
        .from("plans")
        .upload(path, blob, {
          upsert: true,
          contentType: attachment.type || "application/octet-stream",
        });
      if (error) throw error;
      attachment.storagePath = path;
    } else if (!attachment.storagePath?.startsWith(`${user}/`))
      throw new Error(
        `Falta el archivo original ${attachment.name} en este dispositivo. Volvé a adjuntarlo.`,
      );
  }
  const row = {
    id: p.id,
    owner_id: user,
    name: p.name,
    payload: p,
    revision: (revision ?? 0) + 1,
  };
  const query = existing
    ? client
        .from("projects")
        .update(row)
        .eq("id", p.id)
        .eq("revision", revision!)
    : client.from("projects").insert(row);
  const { data, error } = await query.select("revision").single();
  if (error || !data)
    throw new Error(
      error?.code === "PGRST116"
        ? "El proyecto cambió en otro dispositivo. Descargá la nueva versión."
        : (error?.message ?? "No se confirmó el guardado."),
    );
  await saveMeta(key, data.revision);
  return p;
}
export async function pullCloud(
  config: CloudConfig,
  id: string,
): Promise<Project> {
  const client = cloudClient(config),
    user = await identity(client);
  const { data, error } = await client
    .from("projects")
    .select("payload,revision")
    .eq("id", id)
    .single();
  if (error) throw error;
  const p = projectSchema.parse(data.payload);
  for (const attachment of p.attachments)
    if (attachment.storagePath) {
      if (!attachment.storagePath.startsWith(`${user}/`))
        throw new Error("Ruta de archivo no válida.");
      const { data: blob, error } = await client.storage
        .from("plans")
        .download(attachment.storagePath);
      if (error) throw error;
      await saveFile(attachment.id, blob);
    }
  await saveMeta(revisionKey(config.url, user, id), data.revision);
  return p;
}
export interface DetectedPiece {
  name: string;
  quantity: number | null;
  length: number | null;
  width: number | null;
  thickness: number | null;
  material: string;
  grain: "free" | "length" | "width";
  edges: [boolean, boolean, boolean, boolean];
  notes: string;
}
export interface Detection {
  pieces: DetectedPiece[];
  warnings: string[];
}
export async function analyzePlan(
  config: CloudConfig,
  file: Blob,
  name: string,
): Promise<Detection> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error(
      "Para analizar con IA, el archivo debe pesar como máximo 15 MB.",
    );
  const client = cloudClient(config);
  await identity(client);
  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const { data, error } = await client.functions.invoke("analyze-plan", {
    body: { file: base64, mime: file.type, name },
  });
  if (error)
    throw new Error(
      "No se pudo analizar. Comprobá la sesión, el despliegue de analyze-plan y la clave del proveedor. Podés cargar las piezas manualmente.",
    );
  if (data?.error) throw new Error(data.error);
  return data;
}
