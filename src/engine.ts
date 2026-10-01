import type {
  Board,
  Calculation,
  Material,
  MaterialResult,
  Piece,
  Project,
  Rect,
} from "./types";

const positive = (n: number) => Number.isFinite(n) && n > 0 && n <= 1e12;
const nonnegative = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1e12;
export const pieceArea = (p: Piece) => (p.length * p.width * p.quantity) / 1e6;
export const edgeLength = (p: Piece) =>
  (((Number(p.edges[0]) + Number(p.edges[1])) * p.length +
    (Number(p.edges[2]) + Number(p.edges[3])) * p.width) *
    p.quantity) /
  1000;
type Item = { p: Piece; instance: number };

function orientations(p: Piece, m: Material) {
  if (p.grain === "free") return [false, true];
  return [p.grain !== m.grain];
}

/** Guillotine rectangles are disjoint. Kerf is reserved on each split, never outside stock. */
function pack(
  items: Item[],
  material: Material,
  project: Project,
  strategy: number,
): { boards: Board[]; rejected: string[] } {
  const { margin, kerf } = project.settings;
  const boards: Board[] = [];
  const pool = project.offcuts
    .filter((o) => o.materialId === material.id)
    .flatMap((o) =>
      Array.from({ length: o.quantity }, (_, i) => ({
        id: `${o.id}-${i}`,
        length: o.length,
        width: o.width,
      })),
    );
  const create = (
    length: number,
    width: number,
    source: Board["source"],
    id: string,
  ): Board => ({
    id,
    materialId: material.id,
    length,
    width,
    source,
    placements: [],
    free: [
      {
        x: margin,
        y: margin,
        length: length - 2 * margin,
        width: width - 2 * margin,
      },
    ],
  });
  const sorted = [...items].sort((a, b) =>
    strategy === 0
      ? b.p.length * b.p.width - a.p.length * a.p.width
      : Math.max(b.p.length, b.p.width) - Math.max(a.p.length, a.p.width),
  );
  const rejected: string[] = [];
  for (const item of sorted) {
    const options = orientations(item.p, material);
    const choose = (stock: Board[]) => {
      let best:
        | {
            board: Board;
            index: number;
            rotated: boolean;
            length: number;
            width: number;
            score: number;
          }
        | undefined;
      for (const board of stock)
        for (const [index, f] of board.free.entries())
          for (const rotated of options) {
            const length = rotated ? item.p.width : item.p.length,
              width = rotated ? item.p.length : item.p.width;
            if (length > f.length || width > f.width) continue;
            const score = f.length * f.width - length * width;
            if (!best || score < best.score)
              best = { board, index, rotated, length, width, score };
          }
      return best;
    };
    let best = choose(boards);
    if (!best) {
      const candidates = pool.map((o) =>
        create(o.length, o.width, "offcut", o.id),
      );
      best = choose(candidates);
      if (best) {
        pool.splice(
          pool.findIndex((o) => o.id === best!.board.id),
          1,
        );
        boards.push(best.board);
      }
    }
    if (!best) {
      const board = create(
        material.length,
        material.width,
        "new",
        `${material.id}-${boards.length + 1}`,
      );
      best = choose([board]);
      if (best) boards.push(board);
    }
    if (!best) {
      rejected.push(
        `${item.p.name || "Pieza sin nombre"} (${item.p.length} × ${item.p.width} mm): no entra respetando márgenes y veta.`,
      );
      continue;
    }
    const { board, index, rotated, length, width } = best;
    const f = board.free.splice(index, 1)[0];
    board.placements.push({
      pieceId: item.p.id,
      name: item.p.name,
      instance: item.instance,
      x: f.x,
      y: f.y,
      length,
      width,
      rotated,
    });
    const remainingL = f.length - length - kerf,
      remainingW = f.width - width - kerf;
    let free: Rect[];
    // Choose one of two guillotine splits; neither leaves overlapping reusable rectangles.
    if (remainingL > remainingW !== (strategy === 1)) {
      free = [
        { x: f.x + length + kerf, y: f.y, length: remainingL, width: f.width },
        { x: f.x, y: f.y + width + kerf, length, width: remainingW },
      ];
    } else {
      free = [
        { x: f.x + length + kerf, y: f.y, length: remainingL, width },
        { x: f.x, y: f.y + width + kerf, length: f.length, width: remainingW },
      ];
    }
    board.free.push(...free.filter((r) => r.length > 0 && r.width > 0));
  }
  return { boards, rejected: [...new Set(rejected)] };
}

export function calculate(project: Project): Calculation {
  const errors: string[] = [],
    warnings: string[] = [];
  const s = project.settings;
  if (
    ![s.kerf, s.margin, s.wastePercent, s.edgeWastePercent].every(nonnegative)
  )
    errors.push(
      "Corte, margen y desperdicios deben ser números iguales o mayores a cero.",
    );
  if (s.kerf > s.margin)
    warnings.push(
      "El ancho de sierra supera el margen de seguridad. Revisá el escuadrado de las placas.",
    );
  if (project.pieces.reduce((sum, p) => sum + p.quantity, 0) > 2000)
    errors.push(
      "El límite por proyecto es de 2000 piezas. Dividí este trabajo en proyectos.",
    );
  for (const p of project.pieces) {
    if (!p.name.trim()) errors.push("Hay una pieza sin nombre.");
    if (
      !positive(p.length) ||
      !positive(p.width) ||
      !Number.isInteger(p.quantity) ||
      p.quantity < 1 ||
      p.quantity > 2000
    )
      errors.push(
        `${p.name || "Pieza"}: completá medidas positivas y una cantidad entera entre 1 y 2000.`,
      );
    if (!s.materials.some((m) => m.id === p.materialId))
      errors.push(`${p.name || "Pieza"}: seleccioná un material.`);
  }
  for (const o of project.offcuts)
    if (
      !positive(o.length) ||
      !positive(o.width) ||
      !Number.isInteger(o.quantity) ||
      o.quantity < 1 ||
      o.quantity > 100 ||
      !s.materials.some((m) => m.id === o.materialId)
    )
      errors.push(
        "Revisá las medidas, la cantidad (1–100) y el material de los sobrantes.",
      );
  if (project.offcuts.reduce((n, o) => n + o.quantity, 0) > 500)
    errors.push("El límite es de 500 sobrantes por proyecto.");
  for (const m of s.materials) {
    if (
      !positive(m.length) ||
      !positive(m.width) ||
      !positive(m.thickness) ||
      !nonnegative(m.price) ||
      !nonnegative(m.edgePrice) ||
      m.length <= 2 * s.margin ||
      m.width <= 2 * s.margin
    )
      errors.push(
        `${m.name}: dimensiones, espesor o precios de placa incorrectos.`,
      );
  }
  const c = s.costs;
  if (
    ![
      c.laborFixed,
      c.hourlyRate,
      c.hours,
      c.laborPercent,
      c.profitPercent,
    ].every(nonnegative) ||
    (c.profitMode === "margin" && c.profitPercent >= 100)
  )
    errors.push(
      "Revisá los costos. El margen sobre venta debe ser menor al 100 %.",
    );
  for (const e of project.extras)
    if (!nonnegative(e.price) || !positive(e.quantity))
      errors.push(`${e.name || "Gasto"}: revisá cantidad y precio.`);
  const groups: MaterialResult[] = [];
  if (!errors.length)
    for (const material of s.materials) {
      const pieces = project.pieces.filter((p) => p.materialId === material.id);
      if (!pieces.length) continue;
      const items = pieces.flatMap((p) =>
        Array.from({ length: p.quantity }, (_, i) => ({ p, instance: i + 1 })),
      );
      const alternatives = [
        pack(items, material, project, 0),
        pack(items, material, project, 1),
      ];
      alternatives.sort(
        (a, b) =>
          a.rejected.length - b.rejected.length ||
          a.boards.filter((b) => b.source === "new").length -
            b.boards.filter((b) => b.source === "new").length ||
          a.boards.reduce((n, b) => n + b.length * b.width, 0) -
            b.boards.reduce((n, b) => n + b.length * b.width, 0),
      );
      const { boards, rejected } = alternatives[0];
      errors.push(...rejected);
      const area = pieces.reduce((n, p) => n + pieceArea(p), 0),
        boardArea = (material.length * material.width) / 1e6;
      const theoretical = area / boardArea,
        minimum = Math.ceil(theoretical - 1e-10);
      const edgeMeters = pieces.reduce((n, p) => n + edgeLength(p), 0);
      const stockArea = boards.reduce(
        (n, b) => n + (b.length * b.width) / 1e6,
        0,
      );
      const placedArea = boards.reduce(
        (n, b) =>
          n +
          b.placements.reduce((sum, p) => sum + (p.length * p.width) / 1e6, 0),
        0,
      );
      const reusableArea = boards.reduce(
        (n, b) =>
          n + b.free.reduce((sum, r) => sum + (r.length * r.width) / 1e6, 0),
        0,
      );
      const marginLoss = boards.reduce(
        (n, b) =>
          n +
          (b.length * b.width -
            (b.length - 2 * s.margin) * (b.width - 2 * s.margin)) /
            1e6,
        0,
      );
      const kerfLoss = Math.max(
        0,
        stockArea - placedArea - reusableArea - marginLoss,
      );
      const purchased = boards.filter((b) => b.source === "new").length;
      groups.push({
        material,
        area,
        theoretical,
        minimum,
        estimated: Math.ceil(theoretical * (1 + s.wastePercent / 100) - 1e-10),
        boards,
        purchased,
        edgeMeters,
        recommendedEdge: edgeMeters * (1 + s.edgeWastePercent / 100),
        stockArea,
        placedArea,
        reusableArea,
        kerfLoss,
        marginLoss,
        waste: Math.max(0, stockArea - placedArea),
      });
      if (purchased > minimum)
        warnings.push(
          `${material.name}: se necesitan ${purchased} placas frente a ${minimum} por superficie; influyen dimensiones, veta, márgenes y cortes.`,
        );
    }
  const materialCost = groups.reduce(
    (n, g) => n + g.purchased * g.material.price,
    0,
  );
  const edgeCost = groups.reduce(
    (n, g) => n + g.recommendedEdge * g.material.edgePrice,
    0,
  );
  const hardwareCost = project.extras
    .filter((e) => e.kind === "hardware")
    .reduce((n, e) => n + e.quantity * e.price, 0);
  const expenseCost = project.extras
    .filter((e) => e.kind === "expense")
    .reduce((n, e) => n + e.quantity * e.price, 0);
  const laborCost =
    c.laborMode === "fixed"
      ? c.laborFixed
      : c.laborMode === "hourly"
        ? c.hourlyRate * c.hours
        : ((materialCost + edgeCost + hardwareCost) * c.laborPercent) / 100;
  const totalCost =
    materialCost + edgeCost + hardwareCost + laborCost + expenseCost;
  const finalPrice =
    c.profitMode === "margin"
      ? totalCost / (1 - c.profitPercent / 100)
      : totalCost * (1 + c.profitPercent / 100);
  return {
    groups,
    errors: [...new Set(errors)],
    warnings,
    totalArea: project.pieces.reduce((n, p) => n + pieceArea(p), 0),
    totalPieces: project.pieces.reduce((n, p) => n + p.quantity, 0),
    boards: groups.reduce((n, g) => n + g.purchased, 0),
    edgeMeters: groups.reduce((n, g) => n + g.edgeMeters, 0),
    recommendedEdge: groups.reduce((n, g) => n + g.recommendedEdge, 0),
    materialCost,
    edgeCost,
    hardwareCost,
    expenseCost,
    laborCost,
    totalCost,
    finalPrice,
    profit: finalPrice - totalCost,
  };
}
