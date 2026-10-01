import { Plus, Trash2, Copy, Ruler } from "lucide-react";
import type { Piece, Project } from "../types";
import { emptyPiece, uid } from "../defaults";
import { edgeLength, pieceArea } from "../engine";
import { fmt } from "../exports";
import { Empty, Field, Num } from "./Fields";
export function Pieces({
  project: p,
  update,
}: {
  project: Project;
  update: (p: Project) => void;
}) {
  const factor =
    p.settings.unit === "m" ? 1000 : p.settings.unit === "cm" ? 10 : 1;
  const change = (id: string, patch: Partial<Piece>) =>
    update({
      ...p,
      pieces: p.pieces.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  const add = () =>
    update({
      ...p,
      pieces: [
        ...p.pieces,
        {
          ...emptyPiece(p.settings.materials[0]?.id ?? ""),
          name: `Pieza ${p.pieces.length + 1}`,
        },
      ],
    });
  return (
    <section>
      <div className="section-title">
        <div>
          <span className="eyebrow">01 / DESPIECE</span>
          <h2>Cada pieza, en su lugar.</h2>
          <p>Las medidas de corte se guardan siempre en milímetros.</p>
        </div>
        <button
          className="primary"
          disabled={p.pieces.length >= 2000}
          onClick={add}
        >
          <Plus size={18} /> Agregar pieza
        </button>
      </div>
      <div className="toolbar">
        <span>
          <Ruler size={16} /> Unidad de entrada
        </span>
        <select
          aria-label="Unidad de medidas"
          value={p.settings.unit}
          onChange={(e) =>
            update({
              ...p,
              settings: {
                ...p.settings,
                unit: e.target.value as "mm" | "cm" | "m",
              },
            })
          }
        >
          <option value="mm">Milímetros (mm)</option>
          <option value="cm">Centímetros (cm)</option>
          <option value="m">Metros (m)</option>
        </select>
        <span className="muted">El espesor se define en Materiales.</span>
      </div>
      {!p.pieces.length && (
        <Empty title="Empezá por tu primera pieza">
          <p>Agregá medidas a mano o analizá un plano desde Archivos.</p>
          <button onClick={add}>Agregar pieza</button>
        </Empty>
      )}
      <div className="piece-list">
        {p.pieces.map((piece, index) => (
          <article className="piece-card" key={piece.id}>
            <div className="piece-heading">
              <span className="number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <input
                aria-label={`Nombre pieza ${index + 1}`}
                className="piece-name"
                value={piece.name}
                onChange={(e) => change(piece.id, { name: e.target.value })}
              />
              <button
                className="icon"
                title="Duplicar pieza"
                aria-label={`Duplicar ${piece.name}`}
                onClick={() =>
                  update({
                    ...p,
                    pieces: [
                      ...p.pieces,
                      {
                        ...structuredClone(piece),
                        id: uid(),
                        name: `${piece.name} (copia)`,
                      },
                    ],
                  })
                }
              >
                <Copy size={17} />
              </button>
              <button
                className="icon danger"
                aria-label={`Eliminar ${piece.name}`}
                onClick={() =>
                  update({
                    ...p,
                    pieces: p.pieces.filter((x) => x.id !== piece.id),
                  })
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
            <div className="form-grid piece-fields">
              <Num
                label="Cantidad"
                value={piece.quantity}
                min={1}
                step={1}
                onChange={(quantity) => change(piece.id, { quantity })}
              />
              <Num
                label={`Largo (${p.settings.unit})`}
                value={piece.length / factor}
                onChange={(v) =>
                  change(piece.id, {
                    length: Math.round(v * factor * 1000) / 1000,
                  })
                }
              />
              <Num
                label={`Ancho (${p.settings.unit})`}
                value={piece.width / factor}
                onChange={(v) =>
                  change(piece.id, {
                    width: Math.round(v * factor * 1000) / 1000,
                  })
                }
              />
              <Field label="Material / espesor">
                <select
                  value={piece.materialId}
                  onChange={(e) =>
                    change(piece.id, { materialId: e.target.value })
                  }
                >
                  <option value="">Seleccionar material</option>
                  {p.settings.materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.thickness} mm
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Veta de la pieza">
                <select
                  value={piece.grain}
                  onChange={(e) =>
                    change(piece.id, {
                      grain: e.target.value as Piece["grain"],
                    })
                  }
                >
                  <option value="free">Libre · permite girar</option>
                  <option value="length">A lo largo</option>
                  <option value="width">A lo ancho</option>
                </select>
              </Field>
            </div>
            <div className="edge-row">
              <div>
                <span className="field-caption">Lados con canto</span>
                <div className="edge-buttons">
                  {["Largo 1", "Largo 2", "Ancho 1", "Ancho 2"].map(
                    (label, i) => (
                      <label
                        key={label}
                        className={piece.edges[i] ? "edge active" : "edge"}
                      >
                        <input
                          type="checkbox"
                          checked={piece.edges[i]}
                          onChange={(e) => {
                            const edges = [...piece.edges] as Piece["edges"];
                            edges[i] = e.target.checked;
                            change(piece.id, { edges });
                          }}
                        />
                        {label}
                      </label>
                    ),
                  )}
                  <select
                    aria-label={`Cantidad de lados con canto de ${piece.name}`}
                    value=""
                    onChange={(e) =>
                      change(piece.id, {
                        edges: [0, 1, 2, 3].map(
                          (i) => i < Number(e.target.value),
                        ) as Piece["edges"],
                      })
                    }
                  >
                    <option value="">Selección rápida</option>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} lados
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="piece-totals">
                <strong>{fmt(pieceArea(piece))} m²</strong>
                <span>{fmt(edgeLength(piece))} m de canto</span>
              </div>
            </div>
            <input
              className="notes-input"
              aria-label={`Observaciones de ${piece.name}`}
              placeholder="Observaciones: perforaciones, acabado, referencia…"
              value={piece.notes}
              onChange={(e) => change(piece.id, { notes: e.target.value })}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
