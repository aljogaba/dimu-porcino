# Changelog

## 0.5.2-dev

- Se añadieron los distintivos numéricos 04 y 05 en las secciones de Resultado y Métodos.
- Se incorporó una explicación tipo “Dónde:” debajo de cada fórmula para aclarar el significado de los símbolos.
- Se ajustó la presentación de las fórmulas para mejorar su alineación visual.

## 0.5.1-dev

- Se corrigió el error de JavaScript `farmN is not defined` en la ruta del diseño territorial.
- Se ajustó el estilo de los distintivos numéricos de sección para que coincidan mejor con el formato de las otras plataformas.
- Se rediseñó la presentación de fórmulas con un estilo más limpio, tipo ecuación científica sobre fondo blanco.
- Se reforzó la visualización de la ruta del diseño en resultados.

## 0.5.0-dev

- Se adopta el nombre DIMUPorcino (Diseño Integral de Muestreo Porcino).
- Se rediseñan los encabezados de sección con distintivos numéricos más visibles y consistentes con el menú lateral.
- Se reemplaza la sección textual de fórmulas por tarjetas visuales basadas en imágenes SVG con estilo científico.
- Se añade una visualización tipo dashboard + flujo, con la nueva sección “Ruta del diseño”.
- Se incorpora la ruta de secuenciación desde muestras totales disponibles, además de muestras positivas, una sola granja o territorio.

## 0.4.1-dev

- Se añadieron insignias numéricas en los encabezados de secciones para reforzar la correspondencia con el menú lateral.
- Se corrigió el desalineamiento visual de los campos en las rejillas de entrada.
- Se incorporó una sección de fórmulas y lógica del cálculo dentro de los resultados.
- Se agregó un nuevo punto de partida en secuenciación: muestras totales disponibles, con frecuencia esperada de positivas.
- Se corrigió la interpretación visual de la distribución de la muestra: ahora distingue claramente entre distribución proporcional y resultados independientes por unidad.
- Se agregó una gráfica simple de barras para mostrar la asignación de la muestra entre etapas, casetas o lotes.
- Se incorporó una explicación directa del alcance de la conclusión conjunta vs. independiente.
- Se ajustaron los valores iniciales del estimador rápido de inventario: 300 hembras, 2.3 partos, 11 nacidos vivos, 21 días de lactancia, 7 semanas en destete y 4 semanas en crecimiento, desarrollo y finalización.
- Se mejoró el texto del módulo de secuenciación para explicar cómo se cuentan las secuencias y qué implica usar una secuencia por granja o por muestra positiva.
- Se estilizó el menú lateral y se actualizó el pie de página con el formato acordado de cita y licencia.
- El botón de reinicio ahora indica explícitamente que limpia todo y vuelve al inicio.

## 0.4.0-dev

- Reorganización completa en tres rutas: territorio, granja y secuenciación.
- Diseño territorial en dos etapas: granjas y cerdos dentro de granja.
- Población de una granja mediante inventario real o estimado desde hembras reproductoras.
- Inventario visible por sitios o por etapas productivas.
- Distribución proporcional de la muestra entre etapas, sitios, casetas o lotes.
- Detección exacta con población finita y sensibilidad diagnóstica.
- Módulo inicial de secuenciación desde territorio, granja o muestras positivas.
