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

El rendimiento global es el producto de las probabilidades sucesivas de positividad, amplificación del blanco de secuenciación, éxito de secuenciación y éxito de ensamble/control de calidad.

La ruta puede utilizarse de dos maneras:

- **Meta definida:** calcular cuántas muestras iniciales se requieren para alcanzar un número objetivo de secuencias utilizables con una probabilidad especificada.
- **Banco de muestras disponible:** estimar cuántas secuencias utilizables se esperan obtener a partir de un número conocido de muestras.

Cuando se parte de muestras totales ya obtenidas y se proporciona una positividad esperada observada o sustentada, esa positividad representa la salida del tamizaje diagnóstico; no se vuelve a multiplicar por una sensibilidad diagnóstica adicional. Cuando se parte de muestras ya positivas, el embudo comienza directamente en la amplificación del blanco.

La estimación de rendimiento es un valor esperado y no constituye una garantía de obtener exactamente ese número de secuencias.

## 6. Inventario productivo básico

`partos/semana = hembras × partos por hembra por año / 52`

`entradas a etapa = flujo de la etapa anterior × supervivencia`

`inventario de etapa = entradas por semana × duración de la etapa en semanas`

La salida es un inventario promedio simultáneo. El inventario real de la fecha de muestreo tiene prioridad.
