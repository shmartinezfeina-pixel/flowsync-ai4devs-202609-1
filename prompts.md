# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

## Prompt 1

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Vas a escribir la especificación de un código que ya está escrito y ya funciona . No propones nada, no cambias una línea del código: lees lo que hay y escribes lo que hace  hoy . Solo te vas a centrar en la capacidad de gestión de cuentas y accesos (esto incluye registro de usuarios, login de session, sesión y perfil). El resto de capacidades quedan fuera de esta especificación. Quiero que lo describas de punta a punta, es decir, sus dos capas (frontend y backend) y solo esa vertical.

La especificación que generes tiene que seguir esta plantilla en su forma :

 - Arriba, un  ## Purpose; de una o dos frases que describa para qué existe esta capacidad.
 - Debajo,  ## Requirements, y colgando de él  ### Requirement: con los requisitos enumerados con RFC los en los que el sistema  SHALL  hacer algo.
 - Bajo cada requisito, al menos un  #### Scenario: de cuatro almohadillas, con dos viñetas:  **WHEN** y  **THEN**. No hay casilla para el  GIVEN: la precondición se mete dentro del  WHEN.
 - En castellano, salvo las mayúsculas de la RFC.

Además la especificación tiene que cumplir estas condiciones estictamente:

- No quiero que en la especificación utilices términos como ADDED, MODIFIED ni REMOVED. 
- Solo comportamiento observable desde fuera.  Ni un nombre de clase, ni un nombre de archivo, ni una ruta de código. En la API, observable es la petición y la respuesta. En la pantalla, observable es lo que una persona ve y puede hacer.
- No puedes tocar el código existente, el objetivo es describir lo que hace esta capacidad y no arreglar errores existentes.

La especificación la has dejar en  docs/spec-viva/SML.md. La carpeta todavía no existe en el repositorio, créala y ponla ahí. 
```

**Qué salió:** Funcionó a la primera: leyó backend y frontend, verificó la API con peticiones reales, abrió el PR #2 y aplicó las correcciones de la revisión adversarial.

## Prompt 2

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
En función de lo escrito en el documento SML.md dime que requisitos no se están cumpliendo bien en el código
```

**Qué salió:** Aclaró que la spec describe el comportamiento actual (el código la cumple por definición) y listó los comportamientos dudosos que deja ver: tokens sin caducidad, email sensible a mayúsculas, mensajes de error por código de estado, etc.

## Prompt 3

**Modelo:** Opus 5.5
**Herramienta:** Claude Code

```
Actualiza el fichero prompts.md con lo realizado en esta sesión y siguiendo el formato del documento
```

**Qué salió:** Rellenó este fichero sustituyendo el ejemplo.
