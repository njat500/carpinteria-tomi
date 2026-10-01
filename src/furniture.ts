import type { Furniture, Material, Piece } from "./types";
import { emptyPiece } from "./defaults";
export function buildFurniture(f: Furniture, material: Material): Piece[] {
  const thickness = material.thickness;
  if (
    ![f.width, f.height, f.depth, thickness].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    f.width <= 2 * thickness ||
    f.height <= (f.shelves + 2) * thickness ||
    f.depth <= f.shelfSetback ||
    f.shelfSetback < 0 ||
    !Number.isInteger(f.shelves) ||
    f.shelves < 0 ||
    f.shelves > 30
  )
    throw new Error(
      "Revisá las dimensiones: el espacio interior y la profundidad de los estantes deben ser positivos.",
    );
  const piece = (
    name: string,
    length: number,
    width: number,
    quantity: number,
  ): Piece => ({
    ...emptyPiece(material.id),
    name,
    length,
    width,
    quantity,
    edges: [true, false, false, false],
    notes:
      "Plantilla: estantería abierta, uniones a tope, tapa y base entre laterales; canto frontal.",
  });
  return [
    piece("Lateral", f.height, f.depth, 2),
    piece("Tapa", f.width - 2 * thickness, f.depth, 1),
    piece("Base", f.width - 2 * thickness, f.depth, 1),
    ...(f.shelves
      ? [
          piece(
            "Estante",
            f.width - 2 * thickness,
            f.depth - f.shelfSetback,
            f.shelves,
          ),
        ]
      : []),
  ];
}
