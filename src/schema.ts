import { z } from "zod";
// Drafts may contain incomplete/invalid numbers while editing. The calculation
// engine reports semantic errors; saving such a draft must not prevent reopening it.
const number = z.number().finite();
const dimension = number;
const id = z.string().min(1).max(200);
const text = z.string().max(10000);
export const pieceSchema = z.object({
  id,
  name: text,
  quantity: number,
  length: dimension,
  width: dimension,
  materialId: z.string().max(200),
  grain: z.enum(["free", "length", "width"]),
  edges: z.tuple([z.boolean(), z.boolean(), z.boolean(), z.boolean()]),
  notes: text,
});
export const settingsSchema = z.object({
  kerf: number,
  margin: number,
  wastePercent: number,
  edgeWastePercent: number,
  unit: z.enum(["mm", "cm", "m"]),
  currency: z.enum(["ARS", "USD", "EUR"]),
  materials: z
    .array(
      z.object({
        id,
        name: text,
        type: text,
        thickness: dimension,
        length: dimension,
        width: dimension,
        price: number,
        edgePrice: number,
        grain: z.enum(["length", "width"]),
      }),
    )
    .max(100),
  costs: z.object({
    laborMode: z.enum(["fixed", "hourly", "percent"]),
    laborFixed: number,
    hourlyRate: number,
    hours: number,
    laborPercent: number,
    profitPercent: number,
    profitMode: z.enum(["markup", "margin"]),
  }),
});
export const projectSchema = z.object({
  reviewed: z.boolean().default(false),
  furniture: z
    .object({
      width: dimension,
      height: dimension,
      depth: dimension,
      shelves: z.number().int().min(0).max(30),
      shelfSetback: dimension,
      materialId: id,
    })
    .optional(),
  id,
  name: text,
  client: text,
  notes: text,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  status: z.enum(["draft", "quoted", "approved"]),
  pieces: z.array(pieceSchema).max(2000),
  settings: settingsSchema,
  offcuts: z
    .array(
      z.object({
        id,
        materialId: z.string().max(200),
        length: dimension,
        width: dimension,
        quantity: number,
      }),
    )
    .max(500),
  extras: z
    .array(
      z.object({
        id,
        name: text,
        quantity: number,
        price: number,
        kind: z.enum(["hardware", "expense"]),
      }),
    )
    .max(1000),
  attachments: z
    .array(
      z.object({
        id,
        name: text,
        type: text,
        size: number,
        storagePath: z.string().max(1000).optional(),
      }),
    )
    .max(100),
});
