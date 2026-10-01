import { it, expect } from "vitest";
import { buildFurniture } from "../src/furniture";
import { defaults } from "../src/defaults";
import { parseCSV } from "../src/imports";
it("deriva una estantería de uniones a tope con espesores y retiro explícitos", () => {
  const pieces = buildFurniture(
    {
      width: 1200,
      height: 800,
      depth: 300,
      shelves: 1,
      shelfSetback: 20,
      materialId: "melamina-18",
    },
    defaults.materials[0],
  );
  expect(pieces.map((x) => [x.length, x.width, x.quantity])).toEqual([
    [800, 300, 2],
    [1164, 300, 1],
    [1164, 300, 1],
    [1164, 280, 1],
  ]);
});
it("rechaza construcción sin espacio interior", () => {
  expect(() =>
    buildFurniture(
      {
        width: 30,
        height: 800,
        depth: 300,
        shelves: 1,
        shelfSetback: 20,
        materialId: "melamina-18",
      },
      defaults.materials[0],
    ),
  ).toThrow();
});
it("importa CSV con campos entre comillas, punto y coma y decimales", () => {
  const p = parseCSV(
    'Pieza;Cantidad;Largo mm;Ancho mm;Material\n"Estante; central";2;"1200,5";300;Melamina blanca',
    defaults,
  );
  expect(p[0].name).toBe("Estante; central");
  expect(p[0].length).toBe(1200.5);
  expect(p[0].materialId).toBe("melamina-18");
});
it("no asigna automáticamente un material desconocido", () => {
  const p = parseCSV(
    "Pieza,Cantidad,Largo mm,Ancho mm,Material\nTapa,1,1200,300,Roble desconocido",
    defaults,
  );
  expect(p[0].materialId).toBe("");
});
it("rechaza CSV con medidas ausentes", () => {
  expect(() =>
    parseCSV("Pieza;Cantidad;Largo mm;Ancho mm\nTapa;1;;300", defaults),
  ).toThrow();
});
