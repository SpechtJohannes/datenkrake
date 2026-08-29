# React + TypeScript + Vite

## Datenschutz und Datenminimierung

### Lokale Verarbeitung

Datenkrake ist als lokale Anwendung konzipiert. Redmine-Daten werden für die
Auswertung lokal im Browser verarbeitet. Für die Dashboard-Daten verwendet die
Anwendung weder eine eigene Datenbank noch einen Cloudspeicher. Lokale
Datenkrake-Dateien werden über den Browser eingelesen und als lokale Datei
erzeugt.

### Minimales Datenmodell

Redmine-API-Antworten werden beim Übergang in das interne Domain-Modell
unmittelbar reduziert. Das Modell enthält nur Ticket-ID, Betreff, aktuellen
Status, Erstellzeitpunkt, optionalen Abschlusszeitpunkt sowie die für die
Statushistorie erforderlichen Statusänderungen und deren Zeitpunkte.

Nicht übernommen werden insbesondere Autor, Bearbeiter, Beschreibung,
Journalbenutzer, Journalnotizen einschließlich privater Notizen, Custom Fields,
Planungsdaten, Fortschrittswerte, Schätz- und Stundenwerte sowie sonstige für
die aktuellen Auswertungen nicht benötigte Redmine-Metadaten.

### Datenkrake-JSON-Format

Neue Exporte verwenden ausschließlich das minimierte Datenkrake-Format V2. Es
enthält das minimale Domain-Modell und keinen vollständigen Redmine-API-Dump.
Bestehende V1-Dateien können weiterhin importiert werden. Beim Import werden
deren Redmine-nahe Daten unmittelbar auf das minimale Domain-Modell reduziert;
zusätzliche V1-Informationen leben danach nicht im aktiven Datenbestand weiter.

### Redmine-Zugriff

Der Redmine-API-Key wird nur für den Redmine-Zugriff verwendet. Er wird im
React-Zustand gehalten, nach jedem Ladeversuch aus diesem Zustand entfernt,
nicht gespeichert, nicht exportiert und nicht in Fehlermeldungen ausgegeben.

Redmine-Basis-URLs werden zentral validiert. Akzeptiert werden nur syntaktisch
gültige HTTPS-URLs mit vorhandenem Host und ohne eingebetteten Benutzernamen
oder Passwort. Ungültige URLs werden vor einem möglichen Netzwerkzugriff
abgelehnt. Eine allgemeine oder lokale HTTP-Ausnahme existiert nicht.

### Private Redmine-Issues

Private Redmine-Issues werden nicht zusätzlich durch Datenkrake
herausgefiltert. Redmine bleibt die maßgebliche Berechtigungsgrenze:
Datenkrake kann nur Issues verarbeiten, die der verwendete Redmine-Benutzer
aufgrund seiner Redmine-Berechtigungen und des gewählten Filters abrufen kann.
Datenkrake implementiert keine zusätzliche Berechtigungslogik für private
Issues.

Abrufbare private Issues werden wie alle anderen Issues auf das minimale
Domain-Modell reduziert. Diese Entscheidung erhält zugleich die fachliche
Konsistenz der Flow-Metriken. Ein zusätzliches Herausfiltern könnte etwa
Throughput, WIP und Cycle Time gegenüber dem ausgewählten Redmine-Datenbestand
verfälschen.

## Quality analysis

Vitest coverage and the SonarQube Cloud CI integration are documented in
[docs/sonar.md](docs/sonar.md).

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
