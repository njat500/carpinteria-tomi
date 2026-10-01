import { describe, it, expect } from "vitest";
import { calculate, edgeLength, pieceArea } from "../src/engine";
import { newProject, emptyPiece } from "../src/defaults";
import type { Project } from "../src/types";
function project(pieces: [number, number, number][]): Project {
  const p = newProject();
  p.settings.margin = 0;
  p.settings.kerf = 0;
  p.pieces = pieces.map(([length, width, quantity]) => ({
    ...emptyPiece("melamina-18"),
    name: "Pieza",
    length,
    width,
    quantity,
  }));
  return p;
}
describe("materiales y presupuesto", () => {
  it("usa exactamente 4,758 m² y suma áreas en mm", () => {
    const p = project([
      [2000, 600, 1],
      [1500, 400, 1],
      [800, 500, 1],
    ]);
    const c = calculate(p);
    expect(c.totalArea).toBeCloseTo(2.2);
    expect(c.groups[0].theoretical).toBeCloseTo(2.2 / 4.758);
    expect(c.boards).toBe(1);
  });
  it("distingue área y despiece", () => {
    const c = calculate(project([[1500, 1500, 2]]));
    expect(c.groups[0].minimum).toBe(1);
    expect(c.boards).toBe(2);
    expect(c.warnings.length).toBeGreaterThan(0);
  });
  it("suma cantos por cantidad y agrega margen", () => {
    const p = project([[1200, 600, 5]]);
    p.pieces[0].edges = [true, true, true, true];
    expect(edgeLength(p.pieces[0])).toBe(18);
    expect(calculate(p).recommendedEdge).toBeCloseTo(19.8);
  });
  it("rechaza piezas que exceden la placa y dimensiones inválidas", () => {
    expect(calculate(project([[3000, 2000, 1]])).errors.join()).toContain(
      "no entra",
    );
    expect(calculate(project([[0, 600, 1]])).errors.length).toBeGreaterThan(0);
  });
  it("respeta veta y permite rotación libre", () => {
    const p = project([[1700, 2500, 1]]);
    expect(calculate(p).boards).toBe(1);
    p.pieces[0].grain = "length";
    expect(calculate(p).errors.join()).toContain("veta");
  });
  it("reserva kerf y márgenes", () => {
    const p = project([[1300, 1830, 2]]);
    expect(calculate(p).boards).toBe(1);
    p.settings.kerf = 3;
    expect(calculate(p).boards).toBe(2);
    p.settings.margin = 10;
    p.pieces[0].grain = "length";
    expect(calculate(p).errors.length).toBeGreaterThan(0);
  });
  it("reutiliza sobrantes sin cobrar placas nuevas", () => {
    const p = project([[600, 400, 1]]);
    p.offcuts = [
      {
        id: "stock",
        materialId: "melamina-18",
        length: 700,
        width: 500,
        quantity: 1,
      },
    ];
    const c = calculate(p);
    expect(c.boards).toBe(0);
    expect(c.materialCost).toBe(0);
    expect(c.groups[0].boards[0].source).toBe("offcut");
  });
  it("separa materiales", () => {
    const p = project([
      [600, 400, 1],
      [600, 400, 1],
    ]);
    p.pieces[1].materialId = "mdf-18";
    const c = calculate(p);
    expect(c.groups).toHaveLength(2);
    expect(c.boards).toBe(2);
  });
  it("calcula costos con horas, herrajes, gastos y recargo o margen", () => {
    const p = project([[600, 400, 1]]);
    p.settings.costs.hours = 2;
    p.extras = [
      { id: "a", name: "Bisagra", price: 100, quantity: 4, kind: "hardware" },
      { id: "b", name: "Flete", price: 1000, quantity: 1, kind: "expense" },
    ];
    const c = calculate(p);
    expect(c.totalCost).toBe(79400);
    expect(c.finalPrice).toBe(103220);
    p.settings.costs.profitMode = "margin";
    expect(calculate(p).finalPrice).toBeCloseTo(79400 / 0.7);
  });
  it("nunca superpone piezas, sobrantes ni sale de los bordes", () => {
    for (let run = 0; run < 20; run++) {
      const p = project(
        Array.from({ length: 20 }, (_, i) => [
          100 + ((i * 167 + run * 83) % 1100),
          100 + ((i * 53 + run * 97) % 800),
          1,
        ]),
      );
      p.settings.margin = 10;
      p.settings.kerf = 3;
      const c = calculate(p);
      expect(c.errors).toEqual([]);
      let area = 0;
      for (const b of c.groups.flatMap((g) => g.boards)) {
        const rects = [...b.placements, ...b.free];
        b.placements.forEach((r) => {
          area += (r.length * r.width) / 1e6;
          expect(r.x).toBeGreaterThanOrEqual(10);
          expect(r.y).toBeGreaterThanOrEqual(10);
          expect(r.x + r.length).toBeLessThanOrEqual(b.length - 10);
          expect(r.y + r.width).toBeLessThanOrEqual(b.width - 10);
        });
        for (let i = 0; i < rects.length; i++)
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i],
              z = rects[j];
            expect(
              a.x + a.length <= z.x ||
                z.x + z.length <= a.x ||
                a.y + a.width <= z.y ||
                z.y + z.width <= a.y,
            ).toBe(true);
          }
      }
      expect(area).toBeCloseTo(p.pieces.reduce((n, x) => n + pieceArea(x), 0));
    }
  });
});
