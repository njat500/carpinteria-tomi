# Carpintería Tomi

Aplicación responsive para pasar de un plano a un despiece, optimizar cortes y presupuestar trabajos. Sigue el diseño y las decisiones de `diseno/LEER-ANTES-DE-PROGRAMAR.md`.

**Funciona localmente sin cuenta, suscripción ni API de IA.** Supabase y GPT son opcionales. Instalarla no contrata servicios. Esta entrega incluye la integración, pero no una instancia Supabase ni un sitio público ya desplegados.

## Iniciar en tu computadora

Instalá Node.js 24 LTS. Actualizá el repositorio en GitHub Desktop y ejecutá desde su carpeta:

```bash
npm ci
npm run dev
```

Abrí la dirección que Vite muestre en la terminal. Los proyectos y archivos se guardan automáticamente en IndexedDB del navegador. Otro perfil, navegador o dispositivo tiene un almacenamiento independiente.

```bash
npm run build       # Tipos y compilación de producción en dist/
npm run preview     # Probar la compilación
npm test            # Cálculos, importaciones, plantilla y handler IA sin llamadas pagas
npm run test:e2e    # Pruebas en Chromium
```

Para las pruebas se usa Chromium del sistema si está disponible. En otro equipo ejecutá `npx playwright install chromium`; también se admite `CHROMIUM_PATH`.

## Flujo y funciones

1. Sacar foto, subir un archivo o cargar medidas manualmente.
2. Consultar fotos/PDF junto al formulario, completar piezas y confirmar medidas.
3. Ver el plano digital, separado de **Cortes y uso de placa**.
4. Revisar materiales y precios, generar presupuesto y exportar.

- Despiece: nombre, cantidad, dimensiones, material/espesor, veta, cuatro lados con canto y observaciones. Entrada en mm/cm/m; cálculos internos en mm.
- Plantilla de estantería abierta: laterales completos; tapa, base y estantes entre laterales; uniones a tope; retiro frontal configurable; sin fondo, puertas, perforaciones ni herrajes implícitos. Se confirma esta construcción antes de generar piezas.
- Vista frontal acotada para la plantilla; vista digital individual para un despiece personalizado. Editar piezas descarta la asociación con la plantilla para no mostrar un armado incorrecto. No se infiere un mueble universal desde una lista de piezas.
- Los cambios de geometría invalidan la revisión anterior. Para ver planos o emitir un presupuesto se deben confirmar las medidas nuevamente.
- Optimizador guillotina que compara dos distribuciones, respeta kerf, márgenes, rotación, veta, material y espesor, y utiliza sobrantes antes de comprar. Hasta 2000 piezas y 500 sobrantes por proyecto.
- **Placa inicial: 2600 × 1830 mm = 4,758 m².** Cantidad por superficie y cantidad por distribución separadas; la compra se basa en los cortes.
- Áreas separadas: piezas, rectángulos sobrantes reutilizables, pérdida de sierra y descarte de márgenes. Los sobrantes no se descuentan del costo de una placa nueva ya comprada.
- Cantos por lado y cantidad, con margen configurable y precio por metro según material.
- Mano de obra fija, por hora o porcentaje de materiales; herrajes y gastos adicionales. Recargo sobre costo y margen sobre venta con fórmulas explícitas. No se agregan impuestos automáticamente.
- Proyectos: guardar, buscar, duplicar, eliminar localmente y respaldar datos en JSON.
- PDF: **PDF / Imprimir → Guardar como PDF**, con cliente, despiece, materiales, costos y planos. CSV compatible con Excel; planos de corte PNG/SVG y plano del mueble SVG.

### Archivos y respaldo

Se admiten hasta 100 adjuntos de 25 MB cada uno. En móviles, el botón de cámara usa la captura del dispositivo cuando está disponible; **Subir un plano** permite elegir una foto existente. Usá HTTPS para APIs de cámara/navegador.

Un CSV debe incluir `Pieza;Cantidad;Largo mm;Ancho mm;Material`. Admite coma o punto y coma, campos entre comillas y decimales con coma en CSV con punto y coma. También se importa la exportación CSV de la app. Materiales desconocidos requieren selección manual; todos los datos importados deben revisarse.

DWG, DXF, XLS/XLSX, DOC/DOCX y otros archivos se conservan como originales; **no se interpretan automáticamente**. Convertí a PDF desde su programa o transcribí las medidas. No se deducen dimensiones reales de píxeles.

El respaldo JSON contiene los datos y referencias de adjuntos, **no sus bytes**. Descargá los originales por separado o guardalos en Supabase. Borrar los datos del navegador elimina los proyectos locales. Los archivos quitados pueden permanecer almacenados para preservar referencias usadas por copias/importaciones.

## Datos en todos tus dispositivos: Supabase

Podés evaluar el plan gratuito vigente de Supabase y sus límites. Los pasos siguientes se realizan en tu cuenta; no hace falta configurar la nube para usar la app local.

1. Creá un proyecto Supabase.
2. En **SQL Editor**, ejecutá una sola vez [`supabase/migrations/20261001000000_workshop.sql`](supabase/migrations/20261001000000_workshop.sql). Crea proyectos, RLS por usuario, el bucket privado `plans` y un contador para la futura IA.
3. Activá Email en Authentication y configurá **Site URL** y las URL de redirección del sitio. Si está activa la confirmación por correo, confirmá tu cuenta antes de iniciar sesión. El correo de prueba de Supabase tiene límites; para más usuarios puede requerir SMTP.
4. Abrí **Nube y cuenta** en la app e ingresá la URL y la clave **publishable o anon**. Nunca uses `service_role` ni `sb_secret_*` en el navegador.
5. Creá una cuenta e iniciá sesión. Abrí un proyecto y elegí **Subir proyecto abierto**; se guardan los datos y originales.
6. En otro dispositivo, abrí el mismo sitio, conectá el mismo Supabase e iniciá sesión con la misma cuenta. **Actualizar lista → Descargar** recupera un proyecto y sus archivos.
7. Descargá la versión reciente antes de editar en otro dispositivo. La sincronización es explícita; el guardado local es automático. Un contador de revisión impide sobrescribir cambios remotos. Ante un conflicto, duplicá tu versión local y descargá la remota.

Para preconfigurar la conexión, copiá `.env.example` a `.env.local` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Ambas son públicas y quedan en el frontend; sesión y RLS protegen los datos. Los valores habituales del taller son locales; cada proyecto sincroniza su propia copia de los materiales y ajustes. Esta versión no implementa equipos ni edición colaborativa en tiempo real.

## Publicar el sitio

Supabase guarda datos; el frontend se publica por separado:

- **Netlify:** conectá el repositorio, build `npm run build`, publicación `dist`. Incluye `netlify.toml`.
- **Vercel:** importá el repositorio, preset Vite, build `npm run build`, output `dist`.
- Configurá las dos variables públicas de Supabase en el proveedor, o ingresalas en la app de cada dispositivo.
- Usá la URL HTTPS del sitio desde el celular, tablet o computadora. No se necesita instalar una app nativa.

## GPT: preparado, opcional y apagado

No se envían imágenes a un servicio de IA en la configuración predeterminada. La integración requiere una decisión posterior y puede generar cargos. Las pruebas usan respuestas simuladas, sin claves reales ni llamadas pagas.

Cuando decidas habilitarla:

1. Instalá y autenticá Supabase CLI y vinculá el proyecto: `supabase link --project-ref TU_REFERENCIA`.
2. En los secretos de Edge Functions guardá `GPT_API_KEY`. Opcionales: `GPT_MODEL` (predeterminado `gpt-4.1-mini`) y `ALLOWED_ORIGINS` (orígenes HTTPS separados por comas). **Nunca uses una variable `VITE_*` para la clave del proveedor.**
3. Ejecutá `supabase functions deploy analyze-plan`. El `config.toml` deja la validación del token al handler, que consulta Supabase Auth en cada solicitud; no acepta usuarios anónimos.
4. Establecé `VITE_ENABLE_AI=true` y volvé a compilar/publicar. Aparece **Leer plano** para JPG/PNG/WEBP/PDF de hasta 15 MB.
5. Solo al tocar ese botón se envía el archivo al proveedor. El servidor valida sesión, firma del archivo, cuota de 20 intentos diarios por usuario y esquema de respuesta. Usa `store: false` y no registra archivos en logs; esto no sustituye la política de retención del proveedor.
6. Revisá las propuestas. Dimensiones y cantidades faltantes quedan pendientes; no se incorporan al proyecto sin confirmación. El plano digital se genera por código desde las piezas confirmadas, sin deducir ensamblajes ocultos.

La migración y sus políticas se prueban con PostgreSQL local (PGlite): aislamiento entre usuarios, archivos privados, revisiones y cuotas. Las pruebas de IA usan un proveedor simulado. La integración real de Auth, Storage, Edge Functions y lectura GPT requiere desplegar estos recursos y validarlos con tu cuenta.

## Límites y estructura

La distribución guillotina es heurística y no garantiza el mínimo global ni la resistencia del mueble. Verificá secuencia de cortes, uniones, tolerancias y perforaciones en el taller. Los sobrantes son rectángulos libres cuya utilidad depende del próximo trabajo. Los precios iniciales son orientativos y editables.

- `src/engine.ts`: placas, pérdidas, cantos y costos.
- `src/furniture.ts`: plantilla con construcción explícita.
- `src/components/`: pantallas, referencia, revisión, planos y presupuesto.
- `src/storage.ts`: IndexedDB local.
- `src/cloud.ts`: Supabase y control de revisiones.
- `supabase/`: esquema con RLS y función opcional de GPT.
- `tests/`: dominio, servidor y navegador.
- `diseno/`: ejemplos originales conservados sin modificaciones.
