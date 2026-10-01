# Carpintería Tomi — Diseño y alcance inicial

## Pedido para quien desarrolle la aplicación

Desarrollar una aplicación de uso personal para presupuestar trabajos de carpintería, tomando `preview-carpinteria-tomi.html` como referencia visual y de navegación. Priorizar el uso desde el celular y la facilidad de aprendizaje para personas con poca experiencia tecnológica.

**La primera versión no debe usar la API de GPT ni requerir servicios de IA pagos, claves de API o suscripciones.** No configurar servicios pagos sin una nueva decisión explícita del usuario.

## Cómo abrir la referencia

Abrir `preview-carpinteria-tomi.html` en un navegador con doble clic. Es una previsualización interactiva, no la aplicación terminada. Los botones permiten recorrer Inicio, revisión de medidas, plano digital, cortes, presupuesto, proyectos y ayuda.

El HTML incluye su presentación y lógica de demostración. Algunos recursos visuales, como los iconos, pueden necesitar conexión a Internet. No hace llamadas a la API de GPT ni analiza archivos mediante IA.

## Decisiones de interfaz aprobadas

- Mantener la estética de la referencia: fondo degradado cálido, superficie gris clara, tarjetas blancas redondeadas, acentos pastel y botones principales oscuros.
- Inicio sencillo, sin gráficos de uso de placas ni paneles financieros.
- Acciones principales, en orden: sacar foto del plano; subir un plano; ingresar medidas manualmente.
- Menú con texto: Inicio, Mis proyectos y Ayuda. Evitar navegación basada únicamente en iconos.
- Botones grandes, lenguaje cotidiano y una acción principal por paso.
- Flujo: cargar plano → revisar/completar medidas → ver plano digital → revisar materiales y presupuesto.
- Dentro de Ver plano, separar Ver mueble de Cortes y uso de placa. El uso de placa pertenece exclusivamente a este apartado.
- Presupuesto en una pantalla independiente.
- Permitir volver, corregir medidas y recalcular sin perder el proyecto.
- Usar centímetros para la carga sencilla cuando convenga, milímetros para cortes y unidades internas consistentes.

## Primera versión sin API paga

1. Sacar fotos y adjuntar archivos como referencia del proyecto.
2. Mostrar la foto junto a los campos para que el usuario transcriba y confirme medidas, cantidades, espesores y materiales.
3. Permitir carga completamente manual sin fotografía.
4. Generar una vista digital 2D mediante código a partir de datos confirmados. Para el inicio se pueden usar tipos de muebles sencillos y una lista de piezas editable. Definir los detalles de construcción y uniones antes de derivar automáticamente el despiece.
5. Calcular superficies, cantos, materiales y costos mediante código, sin depender de IA.
6. Implementar distribución de cortes con restricciones reales. Separar resultados por material y espesor, y considerar tamaño de placa, ancho de sierra, márgenes, rotación permitida y orientación de veta.
7. Guardar proyectos para uso personal, con una opción de exportación y copia de seguridad. No pedir cuenta para el uso local básico.
8. Incluir presupuestos y exportaciones acordes con los requisitos completos adjuntos. Los archivos no interpretables automáticamente deben seguir pudiendo adjuntarse y completarse manualmente.

La cámara de la aplicación real necesita permiso del dispositivo y un entorno de navegador compatible. Si no está disponible, ofrecer elegir una foto existente.

## Reconocimiento automático opcional, posterior

Puede evaluarse OCR local o una biblioteca gratuita para leer texto y números. Eso no equivale a interpretar de forma fiable un mueble o reconstruir su geometría. Esta mejora no debe bloquear la primera versión ni generar costos de API.

Nunca inventar una medida faltante ni inferir dimensiones reales de una foto sin medidas o escala verificable. Toda detección futura debe presentar los datos como propuestas pendientes de revisión.

## Qué es ilustrativo en el HTML

- Los botones Sacar foto y Subir un plano abren una revisión con datos preparados. No capturan ni procesan archivos reales.
- El mueble es una estantería de ejemplo con un estante interior y sin fondo. No es un generador universal de muebles.
- La distribución de piezas usa una demostración sencilla; no es un optimizador de producción ni un plano validado para fabricar.
- La superficie restante agrupa sobrantes y cortes. La aplicación real debe distinguir sobrantes aprovechables, pérdidas de corte y descarte.
- Los precios son ficticios y algunos costos permanecen fijos en la demo. En la aplicación real todos deben derivarse de cantidades y precios configurables.
- La demo aplica un recargo del 30 % sobre costos. No confundir recargo sobre costo con margen sobre precio de venta; usar nombres y fórmulas explícitos.
- La maqueta no implementa persistencia completa de proyectos, exportación de presupuestos ni validaciones de producción.

## Reglas de cálculo que deben preservarse

- Placa inicial: 2600 × 1830 mm = **4,758 m²**.
- Mostrar cantidad teórica por superficie y cantidad de placas según distribución real, por separado.
- La compra se basa en los cortes, no solamente en redondear el área total.
- Calcular cantos por lados seleccionados y cantidades, con margen configurable.
- Advertir piezas que no entran, datos faltantes, medidas ambiguas y restricciones de veta que impidan ubicarlas.
- Confirmar medidas antes de calcular. Un cambio posterior debe invalidar resultados previos y recalcularlos.

El archivo `requisitos-originales.txt` conserva el pedido completo original. Este documento refleja las decisiones posteriores sobre sencillez, ubicación del uso de placa y ausencia de API paga en la primera versión. En esos puntos prevalecen estas decisiones posteriores.
