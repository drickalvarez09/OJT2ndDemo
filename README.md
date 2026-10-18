# DICT ICT Industry Development Dashboard

A static dashboard for visualizing ICT industry activities, budgets, and fund utilization from Google Sheets.

## Overview

The dashboard provides two views:

- **Charts** — summary cards plus budget, province, industry, and program visualizations.
- **Sheets** — paginated Activities, Per UACS, and Funds tables with shared filtering.

Both views respond to the same filter state (search, program, industry, province, modality).

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- Tailwind CSS (CDN)
- Chart.js with `chartjs-plugin-datalabels`
- Google Sheets CSV endpoint (`gviz/tq`)

No build step or package manager is required.

## Project Structure

```text
.
├── index.html              # Shell, filters, mobile overlays, and view templates
├── index.css               # Layout, chart, table, and responsive styles
├── connect.js              # Google Sheets connector: config, fetch, CSV parsing, demo data
├── sheets-integration.js   # Adapter that reshapes connector data into the legacy view format
├── chart-renderer.js       # Chart.js renderer and responsive chart options
├── scripts.js              # App initialization, filters, views, tables, pagination
└── connecttxt/
    └── googlesheets.txt    # Google Sheets document ID
```

## Getting Started

Serve the project over HTTP. Opening `index.html` directly via `file://` will prevent the configuration file and Google Sheets data from loading.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Configuration

1. Create or open the Google Sheets document containing these sheets:
   - `Activities`
   - `Funds`
   - `Per UACS`
   - `Program`
2. Share the document so it is readable via link.
3. Place the document ID in `connecttxt/googlesheets.txt`.

If the document ID or a sheet cannot be loaded, the connector falls back to built-in demo data.

## Data Flow

1. `connect.js` loads the sheet ID, fetches and parses each sheet, and builds a unified dataset.
2. `sheets-integration.js` converts that dataset into the summary and filter format used by the UI.
3. `scripts.js` initializes the app, populates filter options, renders the active view, and handles filtering and pagination.
4. `chart-renderer.js` renders and updates the Chart.js visualizations.

Fetched data is cached in memory for five minutes.

## Notes

- View markup is stored in `<template>` elements in `index.html` and cloned at runtime.
- Charts adapt their legend placement and label positioning below 500px.
- Keyboard support includes Escape to close mobile overlays and focus trapping within them.
- CDN assets are loaded with `defer`; Chart.js and Tailwind CSS require network access on first load.
