import type { Calculation, Project } from "../types";
import { furnitureSVG } from "./Furniture";
import { boardSVG, fmt, money } from "../exports";
export function PrintReport({
  project: p,
  result: c,
}: {
  project: Project;
  result: Calculation;
}) {
  return (
    <div className="print-report">
      <header>
        <h1>TOMI / Presupuesto</h1>
        <p>
          {new Date().toLocaleDateString("es-AR")} · {p.settings.currency}
        </p>
      </header>
      <h2>{p.name}</h2>
      <p>Cliente: {p.client || "—"}</p>
      {(!p.reviewed || c.errors.length > 0 || !p.pieces.length) && (
        <h2>PRESUPUESTO INCOMPLETO · NO FABRICAR</h2>
      )}
      <p>{p.notes}</p>
      <>
        {p.furniture && (
          <div
            className="print-furniture"
            dangerouslySetInnerHTML={{ __html: furnitureSVG(p) }}
          />
        )}
      </>
      <h3>Despiece</h3>
      <table>
        <thead>
          <tr>
            <th>Pieza</th>
            <th>Cant.</th>
            <th>Medidas (mm)</th>
            <th>Material / espesor</th>
            <th>Cantos</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {p.pieces.map((x) => {
            const m = p.settings.materials.find((m) => m.id === x.materialId);
            return (
              <tr key={x.id}>
                <td>{x.name}</td>
                <td>{x.quantity}</td>
                <td>
                  {x.length} × {x.width}
                </td>
                <td>
                  {m?.name} {m?.thickness} mm
                </td>
                <td>
                  {x.edges
                    .map((v, i) => (v ? ["L1", "L2", "A1", "A2"][i] : ""))
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td>{x.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>Materiales y aprovechamiento</h3>
      {c.groups.map((g) => (
        <p key={g.material.id}>
          {g.material.name} {g.material.thickness} mm: {g.purchased} placas
          nuevas según cortes; {fmt(g.theoretical)} por superficie. Piezas:{" "}
          {fmt(g.area, 3)} m². Área libre + pérdida: {fmt(g.waste, 3)} m².
          Canto: {fmt(g.edgeMeters)} m + {p.settings.edgeWastePercent} % ={" "}
          {fmt(g.recommendedEdge)} m.
        </p>
      ))}
      <h3>Costos</h3>
      <table>
        <tbody>
          {[
            ["Placas", c.materialCost],
            ["Cantos", c.edgeCost],
            ["Herrajes / materiales", c.hardwareCost],
            ["Mano de obra", c.laborCost],
            ["Otros gastos", c.expenseCost],
            ["Costo total", c.totalCost],
            ["Ganancia", c.profit],
            ["Precio final", c.finalPrice],
          ].map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{money(Number(value), p.settings.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {p.settings.costs.profitMode === "markup"
          ? "Recargo sobre costo"
          : "Margen sobre venta"}
        : {p.settings.costs.profitPercent} %. No se agregan impuestos
        automáticamente.
      </p>
      {p.extras.length > 0 && (
        <p>
          Detalle de adicionales:{" "}
          {p.extras
            .map(
              (e) =>
                `${e.name}: ${e.quantity} × ${money(e.price, p.settings.currency)}`,
            )
            .join(" · ")}
        </p>
      )}
      {c.groups.flatMap((g) =>
        g.boards.map((b, i) => (
          <section className="print-board" key={b.id}>
            <h2>
              Plano de corte · {g.material.name} {g.material.thickness} mm
            </h2>
            <p>
              {b.source === "offcut" ? "Sobrante" : "Placa"} {i + 1} ·{" "}
              {b.length} × {b.width} mm · sierra {p.settings.kerf} mm · margen{" "}
              {p.settings.margin} mm
            </p>
            <div dangerouslySetInnerHTML={{ __html: boardSVG(b) }} />
            <ul>
              {b.placements.map((x) => (
                <li key={`${x.pieceId}-${x.instance}`}>
                  {x.name} #{x.instance}: {x.length} × {x.width} mm · origen (
                  {x.x}, {x.y}){x.rotated ? " · girada" : ""}
                </li>
              ))}
            </ul>
            <p>
              Sobrantes:{" "}
              {b.free
                .map((r) => `${fmt(r.length)} × ${fmt(r.width)} mm`)
                .join("; ")}
              .
            </p>
            <p>
              Distribución heurística. Verificar medidas y secuencia de corte en
              taller.
            </p>
          </section>
        )),
      )}
    </div>
  );
}
