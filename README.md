# Muestreo sanitario porcino

Prototipo de herramienta web estática para diseñar muestreos sanitarios en tres niveles:

1. Estado, región o municipio: granjas y cerdos por granja.
2. Una granja: etapa, sitio, caseta o lote y cerdos.
3. Secuenciación: secuencias utilizables, rendimiento laboratorial y población de origen.

## Uso local

Abra `index.html` con Live Server o directamente en un navegador moderno.

## Pruebas

```bash
npm test
```

## Inventario estimado

El módulo usa una versión mínima del flujo de SIPRO-Porcino: hembras reproductoras, partos/hembra/año, nacidos vivos, lactancia, duración de etapas, mortalidad y reemplazos. Su salida es un inventario promedio simultáneo, no el inventario real de una fecha específica.
