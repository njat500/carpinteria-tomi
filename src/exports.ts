import type { Board, Project } from "./types";
import { calculate } from "./engine";
export const fmt = (n: number, digits = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("es-AR", { maximumFractionDigits: digits })
    : "—";
export const money = (n: number, currency: string) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n)
    : "—";
export const escapeXML = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[<>:"/\\|?*]/g, "-");
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function exportJSON(p: Project) {
  download(
    new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
    `${p.name}.json`,
  );
}
const csvCell = (v: unknown) => {
  let text = String(v ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export function exportCSV(p: Project) {
  const result = calculate(p);
  const rows: unknown[][] = [
    ["Proyecto", p.name, "Cliente", p.client],
    [
      "Pieza",
      "Cantidad",
      "Largo mm",
      "Ancho mm",
      "Espesor mm",
      "Material",
      "Veta",
      "Largo 1",
      "Largo 2",
      "Ancho 1",
      "Ancho 2",
      "Observaciones",
    ],
    ...p.pieces.map((x) => [
      x.name,
      x.quantity,
      x.length,
      x.width,
      p.settings.materials.find((m) => m.id === x.materialId)?.thickness,
      p.settings.materials.find((m) => m.id === x.materialId)?.name,
      x.grain,
      ...x.edges.map((e) => (e ? "Sí" : "No")),
      x.notes,
    ]),
    [],
    [
      "Material",
      "Placas superficie",
      "Placas nuevas por cortes",
      "Área piezas m²",
      "Canto recomendado m",
    ],
    ...result.groups.map((g) => [
      g.material.name,
      g.theoretical,
      g.purchased,
      g.area,
      g.recommendedEdge,
    ]),
    [],
    ["Moneda", p.settings.currency],
    ["Placas", result.materialCost],
    ["Cantos", result.edgeCost],
    ["Herrajes", result.hardwareCost],
    ["Mano de obra", result.laborCost],
    ["Otros gastos", result.expenseCost],
    ["Costo total", result.totalCost],
    [
      "Precio final",
      result.errors.length ? "INCOMPLETO: revisar errores" : result.finalPrice,
    ],
  ];
  download(
    new Blob(
      ["\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
    `${p.name}.csv`,
  );
}
export const colors = [
  "#bdd4bd",
  "#e3c99b",
  "#b6cbd2",
  "#d8c1aa",
  "#c6c7de",
  "#dfdba8",
];
export function boardSVG(b: Board): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${b.length} ${b.width}" width="${b.length}" height="${b.width}"><rect width="${b.length}" height="${b.width}" fill="#f0ede5"/>${b.free.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.length}" height="${r.width}" fill="#e7e4dc" stroke="#bbb7ac" stroke-dasharray="10 10"/>`).join("")}${b.placements.map((p, i) => `<g><rect x="${p.x}" y="${p.y}" width="${p.length}" height="${p.width}" fill="${colors[i % colors.length]}" stroke="#365043" stroke-width="2"/><text x="${p.x + p.length / 2}" y="${p.y + p.width / 2 - 8}" text-anchor="middle" font-family="Arial" font-size="${Math.min(38, p.length / 10, p.width / 4)}" fill="#203e31">${escapeXML(p.name)} · ${p.instance}</text><text x="${p.x + p.length / 2}" y="${p.y + p.width / 2 + 32}" text-anchor="middle" font-family="Arial" font-size="${Math.min(28, p.length / 12, p.width / 5)}" fill="#203e31">${p.length} × ${p.width} mm${p.rotated ? " ↻" : ""}</text></g>`).join("")}</svg>`;
}
export async function exportPNG(b: Board, name: string) {
  const svg = new Blob([boardSVG(b)], { type: "image/svg+xml" }),
    url = URL.createObjectURL(svg);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 3000 / Math.max(b.length, b.width));
    canvas.width = Math.round(b.length * scale);
    canvas.height = Math.round(b.width * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo crear la imagen.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo exportar."))),
        "image/png",
      ),
    );
    download(blob, `${name}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
