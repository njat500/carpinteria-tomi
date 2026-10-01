import { emptyPiece, uid } from "./defaults";
import type { Piece, Settings } from "./types";
export function parseCSV(source: string, settings: Settings): Piece[] {
  const delimiter = source
    .split("\n")
    .some((line) => /largo.*;.*ancho/i.test(line))
    ? ";"
    : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV inválido: hay comillas sin cerrar.");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const normalize = (s: string) =>
    s
      .replace(/^\ufeff/, "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const headerIndex = rows.findIndex(
    (r) =>
      r.some((x) => normalize(x).startsWith("largo")) &&
      r.some((x) => normalize(x).startsWith("ancho")),
  );
  if (headerIndex < 0)
    throw new Error(
      "El CSV debe incluir columnas: Pieza, Cantidad, Largo mm, Ancho mm, Material.",
    );
  const headers = rows[headerIndex].map(normalize);
  const get = (r: string[], name: string) =>
    r[headers.findIndex((h) => h === name || h.startsWith(`${name} `))] ?? "";
  const numeric = (v: string) => Number(v.replace(",", "."));
  const output: Piece[] = [];
  for (const r of rows.slice(headerIndex + 1)) {
    if (!r.some((x) => x.trim())) break;
    const length = numeric(get(r, "largo")),
      width = numeric(get(r, "ancho")),
      quantity = numeric(get(r, "cantidad") || "1");
    if (
      !(
        length > 0 &&
        width > 0 &&
        Number.isInteger(quantity) &&
        quantity > 0 &&
        quantity <= 2000
      )
    )
      throw new Error(
        `Medidas o cantidad inválidas en la fila ${output.length + 1}. Usá milímetros.`,
      );
    const materialName = normalize(get(r, "material"));
    const material = settings.materials.find(
      (m) => normalize(m.name) === materialName,
    );
    const grain = get(r, "veta");
    output.push({
      ...emptyPiece(
        material?.id ?? (materialName ? "" : (settings.materials[0]?.id ?? "")),
      ),
      id: uid(),
      name: get(r, "pieza") || get(r, "nombre") || `Pieza ${output.length + 1}`,
      length,
      width,
      quantity,
      grain: grain === "length" || grain === "width" ? grain : "free",
      edges: ["largo 1", "largo 2", "ancho 1", "ancho 2"].map((key) =>
        ["si", "true", "1"].includes(normalize(get(r, key))),
      ) as Piece["edges"],
      notes: get(r, "observaciones"),
    });
    if (output.length > 2000) throw new Error("El archivo excede 2000 filas.");
  }
  if (!output.length) throw new Error("El CSV no contiene piezas.");
  return output;
}
