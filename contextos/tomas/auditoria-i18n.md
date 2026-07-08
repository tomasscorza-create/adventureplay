# Diagnóstico y Auditoría: Sistema Bilingüe (i18n)

> **Fecha de auditoría**: 08 de Julio de 2026  
> **Objetivo**: Evaluar la viabilidad y el estado actual del código para soportar un sistema bilingüe escalable (Español / Inglés).

## A) Estado actual del proyecto respecto a i18n
**No preparado.**  
Actualmente el juego es monolingüe. Fue construido priorizando la funcionalidad y velocidad, por lo que todo el español está fuertemente acoplado (hardcodeado) directamente en la lógica, las vistas y los datos estáticos. No existe ninguna estructura base ni de contexto para soportar un cambio de idioma dinámico.

## B) Dónde están los textos actualmente
Los textos visibles están divididos en dos grandes "capas" de la arquitectura:
1. **Capa UI (Componentes React):** Archivos como `src/ui/screens/MainMenuScreen.tsx`, `ChallengeView.tsx`, `CoopLobby.tsx`, `InventoryView.tsx`. Aquí encontrarás etiquetas puras, por ejemplo: `<button>Jugar en cooperativo</button>`, `<h2>Las camaras antiguas</h2>`.
2. **Capa de Datos Estáticos (TypeScript):** La carpeta `src/game/data/` (`achievements.ts`, `puzzleLevels.ts`, `characters.ts`, `powerShop.ts`). Aquí, los objetos guardan el texto definitivo que luego se pinta en pantalla. Ejemplo: `name: "Mente y acero", description: "Completa la primera cámara"`.

## C) Riesgos actuales
- **Código sucio e inescalable:** Agregar inglés ahora obligaría a duplicar código (ej. hacer un `MainMenuScreen_EN.tsx`) o usar cadenas de condicionales frágiles (`if (lang === 'en')`).
- **Acoplamiento de datos:** Los textos de los niveles y logros están "quemados" en los archivos de datos (`puzzleLevels.ts`). Cambiar de idioma en vivo es imposible bajo la arquitectura actual porque el objeto del logro se inicializa en español al arrancar la aplicación.
- **Errores por tipeo (Typos):** Editar textos directamente dentro del código fuente JSX tiene el riesgo de borrar accidentalmente un cierre de etiqueta HTML o un corchete, rompiendo la compilación.

## D) Qué habría que cambiar
Para hacerlo bilingüe y escalable sin romper el proyecto necesitamos:
1. Crear una carpeta dedicada (ej. `src/i18n/`) que contenga `es.json` y `en.json` (diccionarios centralizados).
2. Crear un Contexto de React (`I18nProvider`) y un hook personalizado (`useTranslation()`).
3. Barrer todos los componentes `.tsx` y reemplazar los textos quemados por la función traductora: `<button>{t("lobby.playCoop")}</button>`.
4. Refactorizar los archivos de `src/game/data/*.ts`. En lugar de tener `name: "Mente y acero"`, usar claves de traducción como `nameKey: "achievements.firstPuzzle.name"`.
5. Agregar un selector de idioma en la UI de "Opciones" y persistir la preferencia en `localStorage`.

## E) Estrategia recomendada
Plan paso a paso seguro:
* **Paso 1:** Construir la base del motor (Crear archivos JSON de diccionarios, hook global).
* **Paso 2:** Hacer una prueba piloto. Tomar una sola pantalla sencilla (como Opciones/Audio) y migrar sus textos al diccionario. Validar que el botón de cambiar idioma funciona sin recargar la página.
* **Paso 3:** Migración masiva de la capa UI (Menús, Botones sueltos, Cabeceras).
* **Paso 4:** Refactorización quirúrgica de la capa de Datos Estáticos (`levels`, `achievements`, `characters`) para inyectar la traducción justo antes de renderizar la UI, evitando romper el guardado de progreso.

## F) Nivel de dificultad
**Difícil (Alto Volumen y Riesgo).**  
La dificultad conceptual (crear un diccionario) es sencilla. Lo que lo eleva a **Difícil** es el altísimo volumen de trabajo manual requerido para barrer decenas de archivos JSX sin romper nada, sumado al riesgo estructural de modificar la capa de Datos (Paso 4), lo cual obliga a ajustar fuertemente las interfaces Typescript.

## G) Primer cambio recomendado
El primer paso 100% seguro y que no rompe nada de la jugabilidad actual es **crear el motor de i18n**. Escribir el contexto de React (`I18nContext.tsx`), el hook (`useTranslation`) y los archivos `es.json` y `en.json` vacíos. Solo dejar la "tubería" instalada.
