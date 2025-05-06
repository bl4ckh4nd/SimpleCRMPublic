// README.md
# SimpleCRM 🚀

SimpleCRM is a slick, desktop-based Customer Relationship Management (CRM) application built with the power of Electron, React, and TypeScript! 💻 It bundles essential CRM features right onto your local machine, helping you manage customers, products, deals, tasks, and your schedule with ease. 🗓️ Plus, it offers optional one-way data sync from your JTL MSSQL database.

## Features ✨

*   **👥 Customer Management:** Create, Read, Update, and Delete customer records like a pro.
*   **📦 Product Management:** Keep track of your local product inventory and details.
*   **💰 Deal Tracking:** Create, manage, and visualize your sales deals. Link products and monitor stages from lead to win!
*   **✅ Task Management:** Stay organized by creating and managing tasks linked directly to customers.
*   **📅 Calendar Integration:** Schedule appointments, meetings, and reminders within the app.
*   **🔗 JTL Synchronization (Optional):** Sync Customer and Product data from an external JTL MSSQL database into your local CRM (one-way sync).
*   **💾 Local Database:** All your CRM data is stored securely and locally using SQLite (`better-sqlite3`).
*   **🔒 Secure Configuration:** MSSQL connection details? Stored safely using your OS keychain via Keytar (`keytar`).

## How it Works 🤔

SimpleCRM leverages the Electron framework to bring a web-powered experience to your desktop:

1.  **🧠 Main Process (`electron/main.js`):** The application's brain! Handles window management, background logic, database interactions (SQLite & MSSQL), and communication between processes (IPC). It kicks off essential services like `sqlite-service`, `mssql-keytar-service`, and `sync-service`.
2.  **🎨 Renderer Process (`src/`):** This is the user interface you see and interact with, built using React and Vite. It talks to the Main process using secure IPC calls (defined in `electron/preload.ts`) to fetch and update data.
3.  **🗄️ Database (`electron/sqlite-service.ts`, `electron/database-schema.ts`):** Your local data vault! Manages the SQLite database (`database.sqlite` in your app data folder), defining the structure and handling all data operations (Create, Read, Update, Delete).
4.  **🔄 MSSQL & Sync (`electron/mssql-keytar-service.ts`, `electron/sync-service.ts`):** Connects (securely!) to your JTL MSSQL database, fetches customer/product data, maps it neatly, and updates your local SQLite database.
5.  **🧩 UI Components (`src/components/`):** Built with the awesome Shadcn/ui library for a consistent and customizable look and feel.

## Tech Stack 🛠️

*   **Framework:** Electron, React
*   **Language:** TypeScript
*   **UI:** Shadcn/ui, Tailwind CSS
*   **Routing:** TanStack Router
*   **Local Database:** SQLite (via `better-sqlite3`)
*   **External DB Connection:** `mssql` package
*   **Secure Storage:** `keytar`
*   **Build Tool:** Vite
*   **Bundler/Packager:** Electron Builder

## Setup & Installation ⚙️

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd simplecrmelectron
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Rebuild Native Modules:**
    Electron apps sometimes need native modules rebuilt for your specific setup. The `postinstall` script *should* handle this, but if you encounter issues, run:
    ```bash
    npm run postinstall
    # or maybe force it with:
    npx electron-rebuild -f -w better-sqlite3,keytar
    ```

## Running the Application 🏃‍♀️

*   **Development Mode (with Hot Reloading 🔥):**
    Starts the Vite dev server for instant UI updates and the Electron app.
    ```bash
    npm run electron:dev
    ```
*   **Production Mode (Simulated Locally):**
    Runs the app as it would be packaged. Make sure you build it first (`npm run build` & `npm run build:electron`).
    ```bash
    npm run electron:start
    ```

## Building the Application 📦

Ready to create an installer (`.exe`, `.dmg`, etc.)?

1.  **Build the Frontend & Electron Code:**
    ```bash
    npm run build
    npm run build:electron
    ```
2.  **Package with Electron Builder:**
    ```bash
    npm run electron:build
    ```
    Look for your shiny new installer in the `dist-build` directory! 🎉

## Configuration 🔧

*   **MSSQL Connection:** Head over to the **Settings** page within the app to configure the connection to your JTL MSSQL database. Your password is kept safe and sound in your operating system's keychain!