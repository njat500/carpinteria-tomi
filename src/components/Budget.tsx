import { Plus, Trash2, Printer, Download } from "lucide-react";
import type { Calculation, CostSettings, Project } from "../types";
import { uid } from "../defaults";
import { exportCSV, fmt, money } from "../exports";
import { Field, Num } from "./Fields";
export function LaborFields({
  costs: c,
  onChange,
  currency,
}: {
  costs: CostSettings;
  onChange: (c: CostSettings) => void;
  currency: string;
}) {
  return (
    <div className="form-grid">
      <Field label="Forma de cobrar mano de obra">
        <select
          value={c.laborMode}
          onChange={(e) =>
            onChange({
              ...c,
              laborMode: e.target.value as CostSettings["laborMode"],
            })
          }
        >
          <option value="fixed">Importe fijo</option>
          <option value="hourly">Por hora</option>
          <option value="percent">Porcentaje de materiales</option>
        </select>
      </Field>
      {c.laborMode === "fixed" && (
        <Num
          label={`Mano de obra (${currency})`}
          value={c.laborFixed}
          onChange={(laborFixed) => onChange({ ...c, laborFixed })}
        />
      )}{" "}
      {c.laborMode === "hourly" && (
        <>
          <Num
            label={`Precio por hora (${currency})`}
            value={c.hourlyRate}
            onChange={(hourlyRate) => onChange({ ...c, hourlyRate })}
          />
          <Num
            label="Horas estimadas"
            value={c.hours}
            onChange={(hours) => onChange({ ...c, hours })}
          />
        </>
      )}
      {c.laborMode === "percent" && (
        <Num
          label="Mano de obra sobre placas, cantos y herrajes (%)"
          value={c.laborPercent}
          onChange={(laborPercent) => onChange({ ...c, laborPercent })}
        />
      )}
      <Field label="Ganancia">
        <select
          value={c.profitMode}
          onChange={(e) =>
            onChange({
              ...c,
              profitMode: e.target.value as CostSettings["profitMode"],
            })
          }
        >
          <option value="markup">Recargo sobre el costo</option>
          <option value="margin">Margen sobre la venta</option>
        </select>
      </Field>
      <Num
        label={`${c.profitMode === "markup" ? "Recargo" : "Margen"} (%)`}
        value={c.profitPercent}
        onChange={(profitPercent) => onChange({ ...c, profitPercent })}
      />
    </div>
  );
}
export function Budget({
  project: p,
  result: c,
  update,
}: {
  project: Project;
  result: Calculation;
  update: (p: Project) => void;
}) {
  const cash = (v: number) => money(v, p.settings.currency),
    valid = p.reviewed && !c.errors.length && p.pieces.length > 0;
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">03 / PRESUPUESTO</span>
          <h2>Un precio con fundamento.</h2>
          <p>
            Placas según cortes, canto con margen y todos los gastos del
            trabajo.
          </p>
        </div>
        <div className="actions">
          <button disabled={!valid} onClick={() => exportCSV(p)}>
            <Download size={17} /> CSV / Excel
          </button>
          <button
            className="primary"
            disabled={!valid}
            onClick={() => window.print()}
          >
            <Printer size={17} /> PDF / Imprimir
          </button>
        </div>
      </div>
      <div className="budget-layout">
        <div>
          <div className="card">
            <h3>Mano de obra y ganancia</h3>
            <LaborFields
              costs={p.settings.costs}
              currency={p.settings.currency}
              onChange={(costs) =>
                update({ ...p, settings: { ...p.settings, costs } })
              }
            />
            <p className="muted">
              {p.settings.costs.profitMode === "markup"
                ? "Precio = costo × (1 + recargo / 100)."
                : "Precio = costo ÷ (1 − margen / 100). El margen debe ser menor al 100 %."}{" "}
              No se agregan impuestos automáticamente.
            </p>
          </div>
          {(["hardware", "expense"] as const).map((kind) => (
            <div className="card space-top" key={kind}>
              <div className="section-title">
                <h3>
                  {kind === "hardware"
                    ? "Herrajes y otros materiales"
                    : "Transporte, instalación y gastos"}
                </h3>
                <button
                  className="icon"
                  aria-label={
                    kind === "hardware" ? "Agregar herraje" : "Agregar gasto"
                  }
                  onClick={() =>
                    update({
                      ...p,
                      extras: [
                        ...p.extras,
                        {
                          id: uid(),
                          name: kind === "hardware" ? "Bisagra" : "Transporte",
                          kind,
                          quantity: 1,
                          price: 0,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={18} />
                </button>
              </div>
              {p.extras
                .filter((e) => e.kind === kind)
                .map((e) => (
                  <div className="extra-row" key={e.id}>
                    <Field label="Concepto">
                      <input
                        value={e.name}
                        onChange={(event) =>
                          update({
                            ...p,
                            extras: p.extras.map((x) =>
                              x.id === e.id
                                ? { ...x, name: event.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Num
                      label="Cantidad"
                      value={e.quantity}
                      onChange={(quantity) =>
                        update({
                          ...p,
                          extras: p.extras.map((x) =>
                            x.id === e.id ? { ...x, quantity } : x,
                          ),
                        })
                      }
                    />
                    <Num
                      label={`Precio (${p.settings.currency})`}
                      value={e.price}
                      onChange={(price) =>
                        update({
                          ...p,
                          extras: p.extras.map((x) =>
                            x.id === e.id ? { ...x, price } : x,
                          ),
                        })
                      }
                    />
                    <button
                      className="icon danger"
                      aria-label={`Eliminar gasto ${e.name}`}
                      onClick={() =>
                        update({
                          ...p,
                          extras: p.extras.filter((x) => x.id !== e.id),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              {!p.extras.some((e) => e.kind === kind) && (
                <p className="muted">Agregá conceptos con el botón +.</p>
              )}
            </div>
          ))}
        </div>
        <aside className="quote-card">
          <span className="eyebrow">RESUMEN DEL PROYECTO</span>
          <h2>{p.name}</h2>
          <p>{p.client || "Sin cliente asignado"}</p>
          <div className="quote-stats">
            <span>{c.boards} placas</span>
            <span>{fmt(c.recommendedEdge)} m de canto</span>
            <span>{c.totalPieces} piezas</span>
          </div>
          <dl>
            {[
              ["Placas", c.materialCost],
              ["Cantos", c.edgeCost],
              ["Herrajes y materiales", c.hardwareCost],
              ["Mano de obra", c.laborCost],
              ["Otros gastos", c.expenseCost],
            ].map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{cash(Number(amount))}</dd>
              </div>
            ))}
            <div className="subtotal">
              <dt>Costo total</dt>
              <dd>{cash(c.totalCost)}</dd>
            </div>
            <div>
              <dt>Ganancia</dt>
              <dd>{cash(c.profit)}</dd>
            </div>
          </dl>
          <div className="final-price">
            <span>PRECIO FINAL · {p.settings.currency}</span>
            <strong>{valid ? cash(c.finalPrice) : "Pendiente"}</strong>
            <small>
              {valid
                ? "Presupuesto calculado con los valores del proyecto."
                : "Completá el despiece y corregí los errores para emitirlo."}
            </small>
          </div>
          <Field label="Estado del proyecto">
            <select
              value={p.status}
              onChange={(e) =>
                update({ ...p, status: e.target.value as Project["status"] })
              }
            >
              <option value="draft">Borrador</option>
              <option value="quoted" disabled={!valid}>
                Presupuestado
              </option>
              <option value="approved" disabled={!valid}>
                Aprobado
              </option>
            </select>
          </Field>
        </aside>
      </div>
    </>
  );
}
