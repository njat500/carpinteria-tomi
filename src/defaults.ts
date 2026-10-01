import type { Project, Settings, Piece } from "./types";
export const uid = () => crypto.randomUUID();
export const defaults: Settings = {
  kerf: 3,
  margin: 10,
  wastePercent: 15,
  edgeWastePercent: 10,
  unit: "cm",
  currency: "ARS",
  materials: [
    {
      id: "melamina-18",
      name: "Melamina blanca",
      type: "Melamina",
      thickness: 18,
      length: 2600,
      width: 1830,
      price: 65000,
      edgePrice: 650,
      grain: "length",
    },
    {
      id: "mdf-18",
      name: "MDF natural",
      type: "MDF",
      thickness: 18,
      length: 2600,
      width: 1830,
      price: 48000,
      edgePrice: 450,
      grain: "length",
    },
    {
      id: "mdf-3",
      name: "MDF fondo",
      type: "MDF",
      thickness: 3,
      length: 2600,
      width: 1830,
      price: 18000,
      edgePrice: 0,
      grain: "length",
    },
  ],
  costs: {
    laborMode: "hourly",
    laborFixed: 0,
    hourlyRate: 6500,
    hours: 0,
    laborPercent: 25,
    profitPercent: 30,
    profitMode: "markup",
  },
};
export const emptyPiece = (materialId: string): Piece => ({
  id: uid(),
  name: "",
  quantity: 1,
  length: 0,
  width: 0,
  materialId,
  grain: "free",
  edges: [false, false, false, false],
  notes: "",
});
export function newProject(settings = defaults): Project {
  const now = new Date().toISOString();
  return {
    reviewed: false,
    id: uid(),
    name: "Nuevo proyecto",
    client: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
    status: "draft",
    pieces: [],
    settings: structuredClone(settings),
    offcuts: [],
    extras: [],
    attachments: [],
  };
}
export function demoProject(settings = defaults): Project {
  const p = newProject(settings);
  p.name = "Mueble de cocina";
  p.client = "Proyecto de ejemplo";
  p.notes =
    "Ejemplo editable. Revisá las medidas y los precios antes de usarlo en un trabajo real.";
  const materialId = settings.materials[0]?.id ?? "";
  p.pieces = [
    {
      ...emptyPiece(materialId),
      name: "Lateral",
      quantity: 2,
      length: 800,
      width: 600,
      edges: [true, false, false, false],
    },
    {
      ...emptyPiece(materialId),
      name: "Tapa",
      quantity: 1,
      length: 1200,
      width: 600,
      edges: [true, true, true, true],
    },
    {
      ...emptyPiece(materialId),
      name: "Estante",
      quantity: 3,
      length: 1100,
      width: 300,
      edges: [true, false, false, false],
    },
  ];
  p.settings.costs.hours = 6;
  return p;
}
