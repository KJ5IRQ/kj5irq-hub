# KJ5IRQ Hub Dashboard

This repository contains a single‑page, fully static dashboard for the amateur radio callsign **KJ5IRQ**.  It is built from plain HTML, CSS and JavaScript with zero external dependencies.  All content and layout are controlled by simple JSON and Markdown files so you can easily customise the site without touching the code.

## Getting Started

No build tools are required.  To run the dashboard locally, clone or download this repository and open `index.html` in your browser.  A lightweight HTTP server is recommended so that `fetch()` calls for JSON files succeed.  You can start a server with Python:

```sh
python3 -m http.server -b 127.0.0.1 8000
```

Then visit <http://127.0.0.1:8000/index.html>.

## Editing Content

* **Navigation and Dock** – Edit `config/site.json`.  The `navLinks` array defines the top navigation items.  The `linkDock` array accepts up to twelve objects with `icon`, `label` and `url` fields.  Only the first six appear by default; the rest are placed in the **More** popover.
* **Dashboard Cards** – Edit `config/layout.json`.  Each module entry has an `id`, `title`, `icon`, `size` (`sm`, `md` or `lg`) and `visible` flag.  Change the order of the array to reorder cards.  Icons reference symbols defined in `assets/icons.svg`.
* **Data Sources** – JSON payloads live in the `data/` directory.  Each file follows a common schema with `schema`, `updated`, `ttlMin`, `source` and `payload` properties.  The application displays a “Stale” chip when `updated` is older than `ttlMin` minutes.  To test without live services, the `data/mock/` directory mirrors these files with safe demo values.  Append `?mock=1` to the page URL to force the mock data set.
* **Markdown Pages** – Long‑form content is stored under `content/`.  The `about.md` file fills the About page, and each entry in `config/site.json`’s `projects` array points to a Markdown file in `content/projects/`.  The client includes a simple Markdown parser supporting headings, paragraphs and unordered lists.

## Features

* **Theme toggle** – Cycle between dark, light and system themes using the sun/moon button in the navigation bar.  Your choice persists in `localStorage` and respects `prefers‑color‑scheme` on first load.
* **Density toggle** – Switch between comfortable and compact spacing using the grid icon.  The setting is stored in `localStorage`.
* **Link dock** – Quick access to external resources with overflow handling.  Additional links collapse into a popover opened with the three‑dot button.
* **Command palette** – Press **Ctrl/⌘ K** to open a searchable palette.  Results include navigation items, link dock entries and dashboard cards.  Select a result with the keyboard or mouse to navigate or scroll to it.
* **Kiosk mode** – Add `?kiosk=1` to the URL to hide the navigation, hero and link dock.  Only the dashboard cards remain – perfect for wall displays.
* **Live/Mock data switch** – Append `?mock=1` to use the `data/mock/` directory instead of the live `data/` files.  Useful for demos or offline environments.
* **Health check** – Visit `health.html` to run a simple validation of JSON files.  The table reports missing files, invalid schemas or stale data.
* **Print styles** – Print the About and Projects pages cleanly; navigation and dashboard elements are hidden when printing.

## Adding New Cards

To add a new dashboard module:

1. Create a JSON file under `data/` (and an equivalent under `data/mock/`) following the common schema.  The `payload` can contain whatever structure your card expects.
2. Add an object to the `modules` array in `config/layout.json` with a unique `id`, a human‑friendly `title`, an `icon` name and optional `size` and `visible` properties.
3. Write a renderer in `assets/app.js` by extending the `moduleHandlers` object.  Each handler receives a container element and the `payload` object.  Render your content using DOM methods.

## License

This project is provided as is under the MIT licence.  Feel free to fork and adapt it for your own station.