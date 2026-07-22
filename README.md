# ✈️ Comparador de Viajes

App para registrar los gastos de tus viajes (pasajes, arriendo, comida, extras, etc.) y comparar cuál viaje resulta más económico.

## Estructura

- `index.html` — estructura de la página
- `styles.css` — estilos
- `app.js` — lógica (viajes, gastos, comparación, guardado en localStorage)
- `electron/main.cjs` — proceso principal de Electron (app de escritorio)
- `build/` — íconos de la app

## Usar en el navegador

Abre `index.html` con doble clic. Los datos se guardan en el navegador (localStorage).

## App de escritorio (Electron)

```bash
npm install
```

Ejecutar en modo escritorio:

```bash
npm start
```

Generar el instalador de Windows (queda en `release/`):

```bash
npm run dist:win
```

> Nota: los datos del navegador y los de la app de escritorio se guardan por separado.

## Dónde se guardan los datos

- **Navegador**: en localStorage del navegador.
- **App de escritorio**: en `%APPDATA%\Comparador de Viajes\viajes-data.json` (archivo de texto que puedes respaldar o copiar a otro PC). La app solo permite una instancia abierta a la vez; si la abres de nuevo, se enfoca la ventana existente.
