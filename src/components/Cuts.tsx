import { Download, Info } from "lucide-react";
import type { Calculation, Project } from "../types";
import { boardSVG, download, exportPNG, fmt } from "../exports";
import { Empty } from "./Fields";
export function Cuts({
  project: p,
  result: c,
  notify,
}: {
  project: Project;
  result: Calculation;
  notify: (s: string) => void;
}) {
  return (
    <>
      <div className="section-title">
        <div>
          <span className="eyebrow">02 / OPTIMIZACIÓN</span>
          <h2>Del despiece a la placa.</h2>
          <p>
            Distribución de cortes rectos con sierra de {fmt(p.settings.kerf)}{" "}
            mm y margen de {fmt(p.settings.margin)} mm.
          </p>
        </div>
      </div>
      <div className="notice">
        <Info size={19} />
        <span>
          Se comparan dos distribuciones de corte guillotina. Es una propuesta
          de taller, no una garantía del mínimo absoluto. Las áreas libres
          incluyen sobrantes reutilizables; verificá la secuencia de corte antes
          de fabricar.
        </span>
      </div>
      {!c.groups.length && (
        <Empty title="Tu plano de corte aparecerá acá">
          <p>Agregá piezas con medidas y material válidos.</p>
        </Empty>
      )}
      {c.groups.map((g) => (
        <section key={g.material.id} className="cut-group">
          <div className="section-title">
            <h3>
              {g.material.name}{" "}
              <span className="muted">/ {g.material.thickness} mm</span>
            </h3>
            <span className="badge">{g.purchased} placas nuevas</span>
          </div>
          <div className="comparison">
            <div>
              <span>Por superficie</span>
              <strong>{fmt(g.theoretical)} placas</strong>
              <small>
                {fmt(g.area, 3)} m² ÷{" "}
                {fmt((g.material.length * g.material.width) / 1e6, 3)} m² ·
                mínimo {g.minimum}
              </small>
            </div>
            <div className="highlight">
              <span>Según los cortes</span>
              <strong>{g.purchased} para comprar</strong>
              <small>
                {g.boards.filter((b) => b.source === "offcut").length} sobrantes
                aprovechados · {g.boards.length} tableros usados
              </small>
            </div>
            <div>
              <span>Área libre + pérdida</span>
              <strong>{fmt(g.waste)} m²</strong>
              <small>
                {fmt(g.stockArea ? (g.waste / g.stockArea) * 100 : 0)} % del
                stock utilizado
              </small>
            </div>
          </div>
          <p className="muted">
            Estimación rápida con {p.settings.wastePercent} % adicional:{" "}
            {g.estimated} placas. La compra se basa en el despiece. Canto:{" "}
            {fmt(g.edgeMeters)} m → {fmt(g.recommendedEdge)} m con margen.
          </p>
          <div className="loss-breakdown">
            <span>
              Sobrantes reutilizables:{" "}
              <strong>{fmt(g.reusableArea, 3)} m²</strong>
            </span>
            <span>
              Pérdida de sierra: <strong>{fmt(g.kerfLoss, 3)} m²</strong>
            </span>
            <span>
              Descarte de márgenes: <strong>{fmt(g.marginLoss, 3)} m²</strong>
            </span>
          </div>
          <div className="boards">
            {g.boards.map((b, i) => (
              <article className="card board-card" key={b.id}>
                <div className="board-header">
                  <div>
                    <span className="eyebrow">
                      {b.source === "offcut" ? "SOBRANTE" : "PLACA"}{" "}
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>
                      {b.length} × {b.width} mm
                    </h3>
                  </div>
                  <div className="actions">
                    <button
                      className="icon"
                      aria-label={`Descargar SVG placa ${i + 1}`}
                      title="Descargar SVG"
                      onClick={() =>
                        download(
                          new Blob([boardSVG(b)], { type: "image/svg+xml" }),
                          `${p.name}-placa-${i + 1}.svg`,
                        )
                      }
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => {
                        void exportPNG(
                          b,
                          `${p.name}-${g.material.name}-placa-${i + 1}`,
                        ).catch((e) => notify(String(e)));
                      }}
                    >
                      PNG
                    </button>
                  </div>
                </div>
                <div
                  className="board-svg"
                  role="img"
                  aria-label={`Plano de corte con ${b.placements.length} piezas`}
                  dangerouslySetInnerHTML={{ __html: boardSVG(b) }}
                />
                <div className="board-footer">
                  <strong>
                    Aprovechamiento{" "}
                    {fmt(
                      (b.placements.reduce(
                        (n, x) => n + x.length * x.width,
                        0,
                      ) /
                        (b.length * b.width)) *
                        100,
                    )}{" "}
                    %
                  </strong>
                  <span>{b.placements.length} piezas · ↻ indica giro</span>
                </div>
                <details>
                  <summary>Medidas y sobrantes aprovechables</summary>
                  <ul className="compact-list">
                    {b.placements.map((x) => (
                      <li key={`${x.pieceId}-${x.instance}`}>
                        {x.name} #{x.instance}: {x.length} × {x.width} mm ·
                        origen ({x.x}, {x.y}){x.rotated ? " · girada" : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="muted">
                    Rectángulos libres (sin superposición):
                  </p>
                  <div className="chips">
                    {b.free.map((r, j) => (
                      <span className="badge" key={j}>
                        {fmt(r.length)} × {fmt(r.width)} mm
                      </span>
                    ))}
                  </div>
                </details>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
