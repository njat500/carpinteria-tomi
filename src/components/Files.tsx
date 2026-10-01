import { useRef, useState } from "react";
import {
  Camera,
  Upload,
  FileText,
  Sparkles,
  Download,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { Attachment, CloudConfig, Piece, Project } from "../types";
import { analyzePlan } from "../cloud";
import { loadFile } from "../storage";
import { emptyPiece, uid } from "../defaults";
import { download, fmt } from "../exports";
import { Field, Num } from "./Fields";
export function Files({
  project: p,
  update,
  upload,
  cloud,
  notify,
}: {
  project: Project;
  update: (p: Project) => void;
  upload: (files: FileList) => void;
  cloud: CloudConfig;
  notify: (s: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null),
    cameraInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null),
    [review, setReview] = useState<Piece[] | null>(null),
    [warnings, setWarnings] = useState<string[]>([]),
    [confirmed, setConfirmed] = useState(false);
  const analyze = async (a: Attachment) => {
    setBusy(a.id);
    setConfirmed(false);
    try {
      const blob = await loadFile(a.id);
      if (!blob)
        throw new Error(
          "El original no está en este dispositivo. Descargá el proyecto desde la nube o adjuntalo de nuevo.",
        );
      if (!cloud.url || !cloud.key)
        throw new Error(
          "Configurá Supabase e iniciá sesión en Nube para analizar planos. La carga manual ya está disponible.",
        );
      const detected = await analyzePlan(cloud, blob, a.name);
      if (
        !Array.isArray(detected.pieces) ||
        detected.pieces.length > 2000 ||
        !Array.isArray(detected.warnings)
      )
        throw new Error(
          "La respuesta de análisis no tiene el formato esperado.",
        );
      setWarnings(detected.warnings);
      setReview(
        detected.pieces.map((d) => ({
          ...emptyPiece(
            p.settings.materials.find(
              (m) =>
                m.name.toLowerCase().includes(d.material.toLowerCase()) &&
                (!d.thickness || m.thickness === d.thickness),
            )?.id ?? "",
          ),
          id: uid(),
          name: d.name,
          quantity: d.quantity ?? 0,
          length: d.length ?? 0,
          width: d.width ?? 0,
          grain: d.grain,
          edges: d.edges,
          notes: [
            d.notes,
            `Detectado: ${d.material || "material pendiente"}; espesor ${d.thickness ?? "pendiente"} mm`,
          ].join(". "),
        })),
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const open = async (a: Attachment) => {
    try {
      const blob = await loadFile(a.id);
      if (!blob)
        throw new Error(
          "Archivo no disponible localmente. Descargá el proyecto desde Nube.",
        );
      download(blob, a.name);
    } catch (e) {
      notify(String(e));
    }
  };
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">EL PUNTO DE PARTIDA</span>
          <h2>Tu próximo trabajo empieza acá.</h2>
          <p>Fotografiá un croquis, subí un plano o cargá las piezas a mano.</p>
        </div>
      </div>
      <div className="upload-options">
        <button
          className="capture-card"
          onClick={() => cameraInput.current?.click()}
        >
          <Camera size={30} />
          <strong>Escanear / sacar foto</strong>
          <span>Abrí la cámara de tu celular</span>
        </button>
        <button
          className="upload-card"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={28} />
          <strong>Subir proyecto</strong>
          <span>PDF, imágenes, CAD, planillas y documentos</span>
        </button>
      </div>
      <input
        hidden
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={fileInput}
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files) upload(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="notice">
        <Sparkles size={19} />
        <span>
          Guardá la foto como referencia y transcribí las medidas en Revisar
          medidas. No hace falta una cuenta ni una API paga. CSV importa listas
          de piezas; DWG, DXF, Excel y Word se adjuntan para consulta o
          conversión a PDF.
        </span>
      </div>
      <div className="attachment-list">
        {p.attachments.map((a) => (
          <article className="attachment" key={a.id}>
            <div className="file-icon">
              <FileText size={22} />
            </div>
            <div className="attachment-name">
              <strong>{a.name}</strong>
              <span>{fmt(a.size / 1024)} KB · original</span>
            </div>
            <div className="actions">
              {import.meta.env.VITE_ENABLE_AI === "true" &&
                [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "application/pdf",
                ].includes(a.type) && (
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      void analyze(a);
                    }}
                  >
                    <Sparkles size={16} />
                    {busy === a.id ? "Analizando…" : "Leer plano"}
                  </button>
                )}
              <button
                className="icon"
                aria-label={`Descargar ${a.name}`}
                onClick={() => {
                  void open(a);
                }}
              >
                <Download size={18} />
              </button>
              <button
                className="icon danger"
                aria-label={`Quitar ${a.name}`}
                onClick={() => {
                  if (confirm("¿Quitar este archivo del proyecto?"))
                    update({
                      ...p,
                      attachments: p.attachments.filter((x) => x.id !== a.id),
                    });
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {review && (
        <section className="card review-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">REVISIÓN OBLIGATORIA</span>
              <h3>Estas son las medidas detectadas.</h3>
              <p>
                Revisá cada dato contra el plano original antes de calcular.
              </p>
            </div>
          </div>
          {warnings.map((w, i) => (
            <div className="notice warning" key={i}>
              <AlertTriangle size={18} />
              {w}
            </div>
          ))}
          {!review.length && (
            <p>No se detectaron piezas. Podés cargarlas desde Despiece.</p>
          )}
          {review.map((piece, i) => {
            const change = (patch: Partial<Piece>) => {
              setConfirmed(false);
              setReview(
                review.map((x, j) => (j === i ? { ...x, ...patch } : x)),
              );
            };
            return (
              <div className="review-piece" key={piece.id}>
                <div className="form-grid">
                  <Field label="Pieza">
                    <input
                      value={piece.name}
                      onChange={(e) => change({ name: e.target.value })}
                    />
                  </Field>
                  <Num
                    label="Cantidad detectada"
                    value={piece.quantity}
                    min={1}
                    step={1}
                    onChange={(quantity) => change({ quantity })}
                  />
                  <Num
                    label="Largo detectado (mm)"
                    value={piece.length}
                    onChange={(length) => change({ length })}
                  />
                  <Num
                    label="Ancho detectado (mm)"
                    value={piece.width}
                    onChange={(width) => change({ width })}
                  />
                  <Field label="Confirmar material y espesor">
                    <select
                      value={piece.materialId}
                      onChange={(e) => change({ materialId: e.target.value })}
                    >
                      <option value="">Seleccionar…</option>
                      {p.settings.materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.thickness} mm
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Veta">
                    <select
                      value={piece.grain}
                      onChange={(e) =>
                        change({ grain: e.target.value as Piece["grain"] })
                      }
                    >
                      <option value="free">Libre</option>
                      <option value="length">Largo</option>
                      <option value="width">Ancho</option>
                    </select>
                  </Field>
                </div>
                <div className="edge-buttons">
                  {["Largo 1", "Largo 2", "Ancho 1", "Ancho 2"].map(
                    (label, k) => (
                      <label className="edge" key={label}>
                        <input
                          type="checkbox"
                          checked={piece.edges[k]}
                          onChange={(e) => {
                            const edges = [...piece.edges] as Piece["edges"];
                            edges[k] = e.target.checked;
                            change({ edges });
                          }}
                        />
                        {label}
                      </label>
                    ),
                  )}
                </div>
                <Field label="Observaciones detectadas">
                  <input
                    value={piece.notes}
                    onChange={(e) => change({ notes: e.target.value })}
                  />
                </Field>
                <button
                  className="text-button danger"
                  onClick={() => {
                    setConfirmed(false);
                    setReview(review.filter((_, j) => j !== i));
                  }}
                >
                  Descartar esta pieza
                </button>
              </div>
            );
          })}
          <label className="check-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Verifiqué las medidas, materiales, veta y cantos con el original.
          </label>
          <div className="actions">
            <button
              className="primary"
              disabled={
                !confirmed ||
                !review.length ||
                review.some(
                  (x) =>
                    !x.name.trim() ||
                    x.length <= 0 ||
                    x.width <= 0 ||
                    !Number.isInteger(x.quantity) ||
                    x.quantity < 1 ||
                    !x.materialId,
                )
              }
              onClick={() => {
                update({ ...p, pieces: [...p.pieces, ...review] });
                setReview(null);
                notify(
                  "Piezas revisadas agregadas al despiece. El plano digital se genera en Cortes.",
                );
              }}
            >
              <Check size={18} /> Confirmar y agregar piezas
            </button>
            <button onClick={() => setReview(null)}>Cancelar revisión</button>
          </div>
        </section>
      )}
    </>
  );
}
