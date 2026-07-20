# SimpleCRM

SimpleCRM is a desktop-based Customer Relationship Management (CRM) application built with Electron, React, and TypeScript. It bundles essential CRM features on your local machine, helping you manage customers, products, deals, tasks, and your schedule. It also offers optional one-way data synchronization from your JTL MSSQL database.

<p align="center">
  <img src="assets/simplecrm.png" alt="SimpleCRM Dashboard" width="800">
</p>

## Features

* **Customer Management:** Create, Read, Update, and Delete customer records.
* **Product Management:** Keep track of your local product inventory and details.
* **Deal Tracking:** Create, manage, and visualize your sales deals. Link products and monitor stages from lead to win.
* **Task Management:** Create and manage tasks linked directly to customers.
* **Calendar Integration:** Schedule appointments, meetings, and reminders within the app.
* **JTL Synchronization (Optional):** Sync Customer and Product data from an external JTL MSSQL database into your local CRM (one-way sync).
* **Local Database:** All your CRM data is stored securely and locally using SQLite (`better-sqlite3`).
* **Secure Configuration:** MSSQL connection details are stored securely using your OS keychain via Keytar (`keytar`).

## How it Works

SimpleCRM leverages the Electron framework to deliver a web-powered experience on your desktop:

1. **Main Process (`electron/main.ts`):** Owns SQLite, MSSQL sync, notifications, business transactions, and IPC. Domain invariants are implemented in focused owner modules rather than renderer call sequences.
2. **Renderer Process (`src/`):** The React/Vite UI. It can invoke only endpoints declared in `shared/ipc/channels.ts` and exposed by `electron/preload.ts`.
3. **IPC Contract (`shared/ipc/channels.ts`):** A single endpoint graph defines each channel together with its Zod input and output schemas. The allowlist and TypeScript types are derived from it.

See [CONTEXT.md](CONTEXT.md) and [the architecture decisions](docs/adr/) for ownership, timing, and deletion invariants.
3. **Database (`electron/sqlite-service.ts`, `electron/database-schema.ts`):** Manages the SQLite database (`database.sqlite` in your app data folder), defining the schema and handling all data operations (Create, Read, Update, Delete).
4. **MSSQL & Sync (`electron/mssql-keytar-service.ts`, `electron/sync-service.ts`):** Connects securely to your JTL MSSQL database, fetches customer and product data, and updates your local SQLite database.
5. **UI Components (`src/components/`):** Built with Shadcn/ui library for a consistent and customizable user interface.

## Tech Stack

* **Framework:** Electron, React
* **Language:** TypeScript
* **UI:** Shadcn/ui, Tailwind CSS
* **Routing:** TanStack Router
* **Local Database:** SQLite (via `better-sqlite3`)
* **External DB Connection:** `mssql` package
* **Secure Storage:** `keytar`
* **Build Tool:** Vite
* **Bundler/Packager:** Electron Builder

## Setup & Installation

1. **Clone the Repository:**
   ```bash
   git clone <your-repository-url>
   cd simplecrmelectron
   ```
2. **Install Dependencies:**
   ```bash
   corepack enable
   pnpm install
   ```
3. **Rebuild Native Modules:**
   Electron apps sometimes need native modules rebuilt for your specific setup. The `postinstall` script should handle this, but if you encounter issues, run:
   ```bash
   pnpm run postinstall
   # or force it with:
   npx electron-rebuild -f -w better-sqlite3,keytar
   ```

## Running the Application

* **Development Mode:**
  Starts one unified dev pipeline (renderer HMR + Electron main hot restart + preload hot reload).
  ```bash
   pnpm run electron:dev
  ```
  While this command is running, you should not need to manually rebuild after code changes.
* **Production Mode:**
  Runs the app as it would be packaged. Build it first with `pnpm run build`.
  ```bash
  pnpm run electron:start
  ```

## Building the Application

To create an installer (`.exe`, `.dmg`, etc.):

1. **Build the Frontend & Electron Code:**
   ```bash
   pnpm run build
   ```
2. **Package with Electron Builder:**
   ```bash
   pnpm run electron:build
   ```
   The installer will be created in the `dist-build` directory.

## Publishing a Release

Releases are published from the **Release** workflow in GitHub Actions. Run it
from the `main` branch and choose a `patch`, `minor`, or `major` increment. The
workflow then:

1. Runs release-script tests, lint, unit/integration tests, both TypeScript
   checks, and the production build.
2. Updates `package.json` and prepends `CHANGELOG.md` from commits since the
   previous `v*` tag. Conventional subjects (`feat:`, `fix:`, `refactor:`, etc.)
   are grouped automatically; other subjects are retained under **Other**.
3. Builds Windows x64 NSIS, macOS x64/arm64 DMG and ZIP, and Linux x64 AppImage
   artifacts on their native GitHub runners.
4. Commits the version and changelog, creates an annotated version tag, pushes
   both atomically, and publishes the GitHub Release with SHA-256 checksums.

The workflow refuses to publish if `main` changes while binaries are building,
or if expected platform artifacts are missing. Current binaries are unsigned;
Windows and macOS may therefore show trust warnings until signing identities
are configured.

## Configuration

* **MSSQL Connection:** Configure the connection to your JTL MSSQL database in the **Settings** page within the app. Your password is stored securely in your operating system's keychain.
