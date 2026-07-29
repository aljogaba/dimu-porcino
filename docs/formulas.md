# Fórmulas y métodos

## 1. Estimación de una proporción

Para prevalencia esperada `p`, precisión absoluta `d` y valor normal `Z`:

`n0 = Z² p(1-p) / d²`

Con población finita `N`:

`n = N n0 / (N + n0 - 1)`

## 2. Detección en una población finita

Se define una prevalencia mínima de diseño. La herramienta calcula el menor `n` cuya probabilidad de detectar al menos un positivo alcanza la confianza indicada. Para población finita usa una distribución hipergeométrica y permite falsos negativos mediante la sensibilidad diagnóstica.

## 3. Especificidad de la clasificación

Cuando una población se declara positiva con al menos una muestra positiva y la especificidad individual es `Sp`:

`HSp = Sp^n`

Para umbrales mayores se usa la distribución binomial de falsos positivos.

## 4. Detección de linajes o variantes

Para detectar una variante con frecuencia mínima `p` y probabilidad `C`:

`n = ceil[ ln(1-C) / ln(1-p) ]`

El resultado representa secuencias utilizables e independientes bajo los supuestos del diseño.

## 5. Embudo laboratorial

El rendimiento global es el producto de las probabilidades sucesivas de positividad, amplificación, secuenciación y aceptación por calidad. La herramienta diferencia el tamaño esperado promedio del tamaño necesario para alcanzar la meta con una probabilidad especificada.

## 6. Inventario productivo básico

`partos/semana = hembras × partos por hembra por año / 52`

`entradas a etapa = flujo de la etapa anterior × supervivencia`

`inventario de etapa = entradas por semana × duración de la etapa en semanas`

La salida es un inventario promedio simultáneo. El inventario real de la fecha de muestreo tiene prioridad.
