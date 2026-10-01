import { describe, expect, it, vi } from "vitest";
import {
  createHandler,
  validDetection,
} from "../supabase/functions/_shared/analyze";
const png = btoa("\x89PNG\r\n\x1a\n" + "0".repeat(20));
const request = (payload: unknown, auth = true) =>
  new Request("https://example.test/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: "Bearer session" } : {}),
    },
    body: JSON.stringify(payload),
  });
const result = {
  pieces: [
    {
      name: "Lateral",
      quantity: 2,
      length: 800,
      width: null,
      thickness: 18,
      material: "MDF",
      grain: "free",
      edges: [false, false, false, false],
      notes: "Ancho pendiente",
    },
  ],
  warnings: ["Falta ancho"],
};
const envValues: Record<string, string> = {
  GPT_API_KEY: "test-only",
  SUPABASE_URL: "https://db.test",
  SUPABASE_ANON_KEY: "public-test",
};
const env = (name: string) => envValues[name];
describe("análisis opcional de planos", () => {
  it("no llama al proveedor sin autenticación", async () => {
    const fetch = vi.fn();
    const handler = createHandler({ env, fetch });
    expect((await handler(request({}, false))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("queda desactivado sin clave configurada", async () => {
    const fetch = vi.fn();
    const handler = createHandler({ env: () => undefined, fetch });
    expect((await handler(request({}))).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rechaza una sesión inválida", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    expect((await createHandler({ env, fetch })(request({}))).status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("verifica tipo y firma del archivo", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"user"}'));
    const h = createHandler({ env, fetch });
    expect(
      (await h(request({ file: png, mime: "application/pdf" }))).status,
    ).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("aplica el límite antes de enviar al proveedor", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"id":"user"}'))
      .mockResolvedValueOnce(new Response("false"));
    expect(
      (
        await createHandler({ env, fetch })(
          request({ file: png, mime: "image/png" }),
        )
      ).status,
    ).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("preserva medidas faltantes y devuelve propuestas", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"id":"user"}'))
      .mockResolvedValueOnce(new Response("true"))
      .mockResolvedValueOnce(
        Response.json({
          status: "completed",
          output: [
            {
              content: [{ type: "output_text", text: JSON.stringify(result) }],
            },
          ],
        }),
      );
    const response = await createHandler({ env, fetch })(
      request({ file: png, mime: "image/png" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    const providerBody = JSON.parse(fetch.mock.calls[2][1].body);
    expect(providerBody.store).toBe(false);
    expect(providerBody.input[0].content).toContain("Nunca deduzcas");
  });
  it("rechaza resultados incompletos sin exponer claves", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"id":"user"}'))
      .mockResolvedValueOnce(new Response("true"))
      .mockResolvedValueOnce(Response.json({ status: "incomplete" }));
    const response = await createHandler({ env, fetch })(
      request({ file: png, mime: "image/png" }),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("test-only");
  });
  it("valida magnitudes, cantos y cantidades de la respuesta", () => {
    expect(validDetection(result)).toBe(true);
    expect(
      validDetection({
        ...result,
        pieces: [{ ...result.pieces[0], length: -1 }],
      }),
    ).toBe(false);
    expect(
      validDetection({
        ...result,
        pieces: [{ ...result.pieces[0], edges: [false] }],
      }),
    ).toBe(false);
  });
});
