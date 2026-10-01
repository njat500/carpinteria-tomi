export type Grain = "free" | "length" | "width";
export interface Material {
  id: string;
  name: string;
  type: string;
  thickness: number;
  length: number;
  width: number;
  price: number;
  edgePrice: number;
  grain: "length" | "width";
}
export interface Piece {
  id: string;
  name: string;
  quantity: number;
  length: number;
  width: number;
  materialId: string;
  grain: Grain;
  edges: [boolean, boolean, boolean, boolean];
  notes: string;
}
export interface Offcut {
  id: string;
  materialId: string;
  length: number;
  width: number;
  quantity: number;
}
export interface Extra {
  id: string;
  name: string;
  quantity: number;
  price: number;
  kind: "hardware" | "expense";
}
export interface CostSettings {
  laborMode: "fixed" | "hourly" | "percent";
  laborFixed: number;
  hourlyRate: number;
  hours: number;
  laborPercent: number;
  profitPercent: number;
  profitMode: "markup" | "margin";
}
export interface Settings {
  kerf: number;
  margin: number;
  wastePercent: number;
  edgeWastePercent: number;
  unit: "mm" | "cm" | "m";
  currency: "ARS" | "USD" | "EUR";
  materials: Material[];
  costs: CostSettings;
}
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  storagePath?: string;
}
export interface Furniture {
  width: number;
  height: number;
  depth: number;
  shelves: number;
  shelfSetback: number;
  materialId: string;
}
export interface Project {
  reviewed: boolean;
  furniture?: Furniture;
  id: string;
  name: string;
  client: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "quoted" | "approved";
  pieces: Piece[];
  settings: Settings;
  offcuts: Offcut[];
  extras: Extra[];
  attachments: Attachment[];
}
export interface Placement {
  pieceId: string;
  name: string;
  x: number;
  y: number;
  length: number;
  width: number;
  rotated: boolean;
  instance: number;
}
export interface Rect {
  x: number;
  y: number;
  length: number;
  width: number;
}
export interface Board {
  id: string;
  materialId: string;
  length: number;
  width: number;
  source: "new" | "offcut";
  placements: Placement[];
  free: Rect[];
}
export interface MaterialResult {
  material: Material;
  area: number;
  theoretical: number;
  minimum: number;
  estimated: number;
  boards: Board[];
  purchased: number;
  edgeMeters: number;
  recommendedEdge: number;
  stockArea: number;
  placedArea: number;
  waste: number;
  reusableArea: number;
  kerfLoss: number;
  marginLoss: number;
}
export interface Calculation {
  groups: MaterialResult[];
  errors: string[];
  warnings: string[];
  totalArea: number;
  totalPieces: number;
  boards: number;
  edgeMeters: number;
  recommendedEdge: number;
  materialCost: number;
  edgeCost: number;
  hardwareCost: number;
  laborCost: number;
  expenseCost: number;
  totalCost: number;
  finalPrice: number;
  profit: number;
}
export interface CloudConfig {
  url: string;
  key: string;
}
