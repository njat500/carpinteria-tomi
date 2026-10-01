import { Plus, Trash2 } from "lucide-react";
import type { Material, Project, Settings } from "../types";
import { uid } from "../defaults";
import { Field, Num } from "./Fields";
import { fmt } from "../exports";
export function MaterialSettings({
  settings: s,
  onChange,
  usedIds = [],
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  usedIds?: string[];
}) {
  const change = (id: string, patch: Partial<Material>) =>
    onChange({
      ...s,
      materials: s.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">MATERIALES Y MÁQUINA</span>
          <h2>Prepará tu taller.</h2>
          <p>
            Precios de referencia editables. Cada espesor o acabado utiliza un
            material distinto.
          </p>
        </div>
        <button
          disabled={s.materials.length >= 100}
          onClick={() =>
            onChange({
              ...s,
              materials: [
                ...s.materials,
                {
                  id: uid(),
                  name: "Nuevo material",
                  type: "Otro",
                  thickness: 18,
                  length: 2600,
                  width: 1830,
                  price: 0,
                  edgePrice: 0,
                  grain: "length",
                },
              ],
            })
          }
        >
          <Plus size={18} /> Material
        </button>
      </div>
      <div className="card form-grid">
        <Num
          label="Ancho de sierra / kerf (mm)"
          value={s.kerf}
          onChange={(kerf) => onChange({ ...s, kerf })}
        />
        <Num
          label="Margen por borde (mm)"
          value={s.margin}
          onChange={(margin) => onChange({ ...s, margin })}
        />
        <Num
          label="Desperdicio para estimación (%)"
          value={s.wastePercent}
          onChange={(wastePercent) => onChange({ ...s, wastePercent })}
        />
        <Num
          label="Margen de canto (%)"
          value={s.edgeWastePercent}
          onChange={(edgeWastePercent) => onChange({ ...s, edgeWastePercent })}
        />
        <Field label="Moneda">
          <select
            value={s.currency}
            onChange={(e) =>
              onChange({
                ...s,
                currency: e.target.value as Settings["currency"],
              })
            }
          >
            <option value="ARS">Pesos argentinos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
            <option value="EUR">Euros (EUR)</option>
          </select>
        </Field>
      </div>
      <div className="material-list">
        {s.materials.map((m) => (
          <article className="card" key={m.id}>
            <div className="material-heading">
              <span className="wood-chip" />
              <input
                aria-label="Nombre del material"
                className="piece-name"
                value={m.name}
                onChange={(e) => change(m.id, { name: e.target.value })}
              />
              <span className="badge">
                {fmt((m.length * m.width) / 1e6, 3)} m² / placa
              </span>
              <button
                className="icon danger"
                title={
                  usedIds.includes(m.id)
                    ? "Este material está en uso"
                    : "Eliminar material"
                }
                disabled={usedIds.includes(m.id)}
                aria-label={`Eliminar material ${m.name}`}
                onClick={() =>
                  onChange({
                    ...s,
                    materials: s.materials.filter((x) => x.id !== m.id),
                  })
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
            <div className="form-grid">
              <Field label="Tipo de placa">
                <select
                  value={m.type}
                  onChange={(e) => change(m.id, { type: e.target.value })}
                >
                  {[
                    "Melamina",
                    "MDF",
                    "Fenólico",
                    "OSB",
                    "Contrachapado",
                    "Madera maciza",
                    "Otro",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Num
                label="Espesor (mm)"
                value={m.thickness}
                onChange={(thickness) => change(m.id, { thickness })}
              />
              <Num
                label="Largo de placa (mm)"
                value={m.length}
                onChange={(length) => change(m.id, { length })}
              />
              <Num
                label="Ancho de placa (mm)"
                value={m.width}
                onChange={(width) => change(m.id, { width })}
              />
              <Num
                label={`Precio por placa (${s.currency})`}
                value={m.price}
                onChange={(price) => change(m.id, { price })}
              />
              <Num
                label={`Precio de canto / m (${s.currency})`}
                value={m.edgePrice}
                onChange={(edgePrice) => change(m.id, { edgePrice })}
              />
              <Field label="Veta de la placa">
                <select
                  value={m.grain}
                  onChange={(e) =>
                    change(m.id, { grain: e.target.value as Material["grain"] })
                  }
                >
                  <option value="length">A lo largo</option>
                  <option value="width">A lo ancho</option>
                </select>
              </Field>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
export function Materials({
  project: p,
  update,
}: {
  project: Project;
  update: (p: Project) => void;
}) {
  return (
    <>
      <MaterialSettings
        settings={p.settings}
        onChange={(settings) => update({ ...p, settings })}
        usedIds={[
          ...p.pieces.map((x) => x.materialId),
          ...p.offcuts.map((x) => x.materialId),
        ]}
      />
      <div className="section-title space-top">
        <div>
          <h3>Sobrantes disponibles</h3>
          <p>
            Se usan antes de comprar placas nuevas. Medidas en mm; la veta sigue
            al material.
          </p>
        </div>
        <button
          onClick={() =>
            update({
              ...p,
              offcuts: [
                ...p.offcuts,
                {
                  id: uid(),
                  materialId: p.settings.materials[0]?.id ?? "",
                  length: 1000,
                  width: 600,
                  quantity: 1,
                },
              ],
            })
          }
        >
          <Plus size={17} /> Sobrante
        </button>
      </div>
      {p.offcuts.map((o) => (
        <div className="card form-grid offcut" key={o.id}>
          <Field label="Material">
            <select
              value={o.materialId}
              onChange={(e) =>
                update({
                  ...p,
                  offcuts: p.offcuts.map((x) =>
                    x.id === o.id ? { ...x, materialId: e.target.value } : x,
                  ),
                })
              }
            >
              {p.settings.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.thickness} mm
                </option>
              ))}
            </select>
          </Field>
          {(["length", "width", "quantity"] as const).map((key, i) => (
            <Num
              key={key}
              label={["Largo (mm)", "Ancho (mm)", "Cantidad"][i]}
              value={o[key]}
              step={key === "quantity" ? 1 : "any"}
              onChange={(v) =>
                update({
                  ...p,
                  offcuts: p.offcuts.map((x) =>
                    x.id === o.id ? { ...x, [key]: v } : x,
                  ),
                })
              }
            />
          ))}
          <button
            className="icon danger"
            aria-label="Eliminar sobrante"
            onClick={() =>
              update({ ...p, offcuts: p.offcuts.filter((x) => x.id !== o.id) })
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </>
  );
}
