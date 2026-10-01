import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("flujo completo de ejemplo, edición, confirmación, cortes y presupuesto", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "¿Qué vamos a construir?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver plano de ejemplo" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu plano digital" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cortes y uso de placa", exact: true })
    .click();
  await expect(page.getByText("1 para comprar", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Corregir medidas", exact: true })
    .click();
  await page.getByLabel("Largo (cm)", { exact: true }).first().fill("90");
  await page.getByRole("button", { name: "Ver plano", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Primero revisemos las medidas" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar medidas", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Confirmar medidas y ver plano" })
    .click();
  await expect(
    page.getByText("Despiece personalizado:", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver presupuesto", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "PDF / Imprimir" }),
  ).toBeEnabled();
  const exportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV / Excel" }).click();
  expect((await exportPromise).suggestedFilename()).toContain(".csv");
  await page
    .getByLabel("Nombre del proyecto", { exact: true })
    .fill("Estantería probada");
  await expect(page.getByText("Guardando…", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Estantería probada", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Estantería probada", exact: true })
    .click();
  await expect(
    page.getByLabel("Largo (cm)", { exact: true }).first(),
  ).toHaveValue("90");
  expect(errors).toEqual([]);
});
test("mobile: manual, validaciones, duplicación y persistencia", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "No tengo plano · Ingresar medidas" })
    .click();
  await page
    .getByRole("button", { name: "Agregar pieza", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmar medidas y ver plano" }),
  ).toBeDisabled();
  await page.getByLabel("Nombre pieza 1").fill("Tapa");
  await page.getByLabel("Largo (cm)", { exact: true }).fill("120");
  await page.getByLabel("Ancho (cm)", { exact: true }).fill("60");
  await page
    .getByLabel("Cantidad de lados con canto de Tapa")
    .selectOption("4");
  await expect(page.getByText("3,6 m de canto", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar medidas y ver plano" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu plano digital" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Menú principal" })
    .getByRole("button", { name: "Mis proyectos" })
    .click();
  await page.getByRole("button", { name: "Duplicar", exact: true }).click();
  await expect(page.getByLabel("Nombre del proyecto")).toHaveValue(
    "Nuevo proyecto (copia)",
  );
  await page.getByRole("button", { name: "Presupuesto", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("adjunta una imagen real y muestra referencia junto a las medidas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Subir archivos").setInputFiles({
    name: "croquis.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG7sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("img", { name: "Plano original: croquis.png" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archivos", exact: true }).click();
  await expect(page.getByText("croquis.png", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Leer plano", exact: true }),
  ).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar croquis.png" }).click();
  expect((await download).suggestedFilename()).toBe("croquis.png");
});

test("un borrador inválido se conserva y se puede corregir al reabrir", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "No tengo plano · Ingresar medidas" })
    .click();
  await page
    .getByRole("button", { name: "Agregar pieza", exact: true })
    .first()
    .click();
  await page.getByLabel("Cantidad", { exact: true }).fill("0");
  await page.getByLabel("Largo (cm)", { exact: true }).fill("-10");
  await expect(page.getByText("Guardando…", { exact: true })).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Nuevo proyecto", exact: true })
    .click();
  await expect(page.getByLabel("Cantidad", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Largo (cm)", { exact: true })).toHaveValue(
    "-10",
  );
  await page.getByLabel("Cantidad", { exact: true }).fill("1");
  await page.getByLabel("Largo (cm)", { exact: true }).fill("120");
  await page.getByLabel("Ancho (cm)", { exact: true }).fill("60");
  await expect(
    page.getByRole("button", { name: "Confirmar medidas y ver plano" }),
  ).toBeEnabled();
});

test("exporta imágenes y respaldo, e importa nuevamente los datos", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ver plano de ejemplo" }).click();
  await page
    .getByRole("button", { name: "Cortes y uso de placa", exact: true })
    .click();
  const pngPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).first().click();
  const png = await pngPromise;
  const bytes = await readFile((await png.path())!);
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  const backupPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Respaldo JSON", exact: true })
    .click();
  const backup = await backupPromise;
  const path = (await backup.path())!;
  const data = JSON.parse(await readFile(path, "utf8"));
  expect(data.pieces).toHaveLength(4);
  await page
    .getByRole("navigation", { name: "Menú principal" })
    .getByRole("button", { name: "Mis proyectos" })
    .click();
  await page
    .locator('input[type="file"][accept=".json,application/json"]')
    .setInputFiles(path);
  await expect(
    page.getByLabel("Nombre del proyecto", { exact: true }),
  ).toHaveValue("Estantería del living (importado)");
  await expect(page.getByLabel("Nombre pieza 1")).toHaveValue("Lateral");
});
