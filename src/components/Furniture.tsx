import { useState } from "react";
import { Check, Download } from "lucide-react";
import type { Furniture, Project } from "../types";
import { buildFurniture } from "../furniture";
import { Field, Num } from "./Fields";
import { download, escapeXML, fmt } from "../exports";
export function FurnitureBuilder({
  project: p,
  update,
  notify,
}: {
  project: Project;
  update: (p: Project) => void;
  notify: (s: string) => void;
}) {
  const [f, setF] = useState<Furniture>(
    p.furniture ?? {
      width: 1200,
      height: 800,
      depth: 300,
      shelves: 1,
      shelfSetback: 20,
      materialId: p.settings.materials[0]?.id ?? "",
    },
  );
  const [approved, setApproved] = useState(false);
  const change = (patch: Partial<Furniture>) => {
    setApproved(false);
    setF({ ...f, ...patch });
  };
  return (
    <details className="card furniture-builder">
      <summary>Empezar con una estantería sencilla</summary>
      <p>
        Sin puertas ni fondo. Laterales de altura completa; tapa, base y
        estantes entre los laterales, con uniones a tope. No se incluyen
        perforaciones ni herrajes.
      </p>
      <div className="form-grid">
        <Num
          label="Ancho total (cm)"
          value={f.width / 10}
          onChange={(n) => change({ width: n * 10 })}
        />
        <Num
          label="Alto total (cm)"
          value={f.height / 10}
          onChange={(n) => change({ height: n * 10 })}
        />
        <Num
          label="Profundidad (cm)"
          value={f.depth / 10}
          onChange={(n) => change({ depth: n * 10 })}
        />
        <Num
          label="Estantes interiores"
          value={f.shelves}
          step={1}
          onChange={(shelves) => change({ shelves })}
        />
        <Num
          label="Retiro frontal del estante (mm)"
          value={f.shelfSetback}
          onChange={(shelfSetback) => change({ shelfSetback })}
        />
        <Field label="Material y espesor">
          <select
            value={f.materialId}
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
      </div>
      <label className="check-confirm">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
        Confirmo estas medidas y la construcción descrita. Se asignará canto al
        frente de cada pieza.
      </label>
      <button
        className="primary"
        disabled={!approved}
        onClick={() => {
          try {
            const material = p.settings.materials.find(
              (m) => m.id === f.materialId,
            );
            if (!material) throw new Error("Seleccioná el material.");
            const pieces = buildFurniture(f, material);
            if (
              p.pieces.length &&
              !confirm(
                "Esta plantilla reemplazará el despiece actual. ¿Continuar?",
              )
            )
              return;
            update({ ...p, pieces, furniture: f, reviewed: true });
            notify(
              "Despiece generado. Revisá el mueble y sus cortes en Ver plano.",
            );
          } catch (e) {
            notify(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        <Check size={17} /> Generar despiece de estantería
      </button>
    </details>
  );
}
export function furnitureSVG(p: Project) {
  const f = p.furniture;
  if (!f) return "";
  const material = p.settings.materials.find((m) => m.id === f.materialId);
  if (!material) return "";
  const t = material.thickness,
    inner = f.height - (f.shelves + 2) * t,
    spacing = inner / (f.shelves + 1);
  const pad = Math.max(f.width, f.height) * 0.13,
    fontSize = Math.max(f.width, f.height) * 0.029;
  const rect = (x: number, y: number, w: number, h: number) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b4c9cf" stroke="#607c86" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${f.width + 2 * pad} ${f.height + 2 * pad}" role="img"><title>Vista frontal de ${escapeXML(p.name)}</title><rect width="${f.width}" height="${f.height}" fill="#eff6f8"/>${rect(0, 0, t, f.height)}${rect(f.width - t, 0, t, f.height)}${rect(t, 0, f.width - 2 * t, t)}${rect(t, f.height - t, f.width - 2 * t, t)}${Array.from({ length: f.shelves }, (_, i) => rect(t, t + spacing * (i + 1) + t * i, f.width - 2 * t, t)).join("")}<g fill="#536a72" font-family="Arial" font-size="${fontSize}" text-anchor="middle"><text x="${f.width / 2}" y="${-pad * 0.35}">← ${fmt(f.width / 10)} cm →</text><text transform="translate(${f.width + pad * 0.4}, ${f.height / 2}) rotate(90)">${fmt(f.height / 10)} cm</text><text x="${f.width / 2}" y="${f.height + pad * 0.6}">Profundidad: ${fmt(f.depth / 10)} cm</text></g></svg>`;
}
export function FurnitureView({ project: p }: { project: Project }) {
  const svg = furnitureSVG(p);
  return (
    <div className="card">
      <h2>Tu plano digital</h2>
      {svg ? (
        <>
          <div
            className="digital-furniture"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="muted">
            Vista frontal · {p.furniture!.shelves} estantes · sin fondo ·
            uniones a tope. El retiro frontal de los estantes es de{" "}
            {p.furniture!.shelfSetback} mm.
          </p>
          <button
            onClick={() =>
              download(
                new Blob([svg], { type: "image/svg+xml" }),
                `${p.name}-mueble.svg`,
              )
            }
          >
            <Download size={17} /> Descargar plano del mueble
          </button>
        </>
      ) : (
        <>
          <p>
            Despiece personalizado: cada rectángulo representa una pieza
            confirmada. La disposición de armado no se infiere de una lista de
            piezas.
          </p>
          <div className="digital-pieces">
            {p.pieces.map((x) => (
              <figure key={x.id}>
                <svg
                  viewBox={`-40 -40 ${x.length + 80} ${x.width + 80}`}
                  role="img"
                  aria-label={`${x.name}: ${x.length} por ${x.width} milímetros`}
                >
                  <rect
                    width={x.length}
                    height={x.width}
                    fill="#bfdfea"
                    stroke="#668a99"
                    strokeWidth={4}
                  />
                </svg>
                <figcaption>
                  <strong>
                    {x.name} × {x.quantity}
                  </strong>
                  <span>
                    {x.length} × {x.width} mm
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      <p className="muted space-top">
        El plano representa las medidas cargadas. Verificá uniones, tolerancias,
        resistencia y perforaciones antes de fabricar.
      </p>
    </div>
  );
}
