# Changelog

All notable changes to SimpleCRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.6] - 2026-03-30

### Added
- **Follow-Up Queue**: New dedicated follow-up page with a smart queue rail, priority indicators, snooze popover, and instant detail panel. Log activities, view the full activity timeline per customer, and filter/sort the queue from a toolbar.
- **Onboarding Checklist**: Dashboard now shows a getting-started checklist (configure DB → sync JTL → add customers → create first deal) when the database is empty, guiding new users through initial setup.
- **Inline Deal & Task Creation on Customer Detail**: Create deals and tasks directly from the customer detail page via dialogs, without navigating away. Customer delete now uses a proper `AlertDialog` for destructive confirmation.
- **CSV Export**: Export button replaced with a format dropdown offering CSV and JSON. CSV files are BOM-prefixed for correct Excel encoding on Windows.
- **Deal Deletion**: Deals can now be deleted from the deal detail page. Deleting a deal removes its associated products before removing the deal row.
- **Deal Tasks Panel**: Deal detail page fetches and displays all tasks linked to the deal's customer.
- **Auto-Update System**: Electron app checks for and installs updates automatically via `electron-updater`. An update status indicator is shown in the UI during download and install.
- **Calendar Integration**: Tasks are linked to the calendar view with a new event-type colour legend.
- **Error Boundary**: A top-level `ErrorBoundary` component catches runtime errors and provides a reset action, preventing the entire app from going blank on unexpected errors.
- **Empty State & Page Header Components**: Reusable `EmptyState` and `PageHeader` components for consistent no-data UI and page title/action layouts.
- **LICENSE**: MIT license added to the repository.

### Changed
- **Deal Detail UI**: Inline stage-change `Select` on kanban cards avoids full-page navigation. Breadcrumb navigation replaces the back button. Redundant Products tab removed.
- **Customer Detail**: Default tab changed to "Deals" for quicker access. Status labels localized.
- **Settings Page**: Layout condensed and reorganized; MSSQL and sync sections restructured for clarity.
- **Main Navigation**: Simplified and tightened layout; Follow-Up added as a primary nav item.
- **Router**: Migrated from deprecated `new Route/Router` API to `createRoute/createRouter`. Added redirect from `/login` to `/` and wrapped the root outlet in `ErrorBoundary`.
- **IPC Modules**: All IPC handler imports switched from `@shared/ipc` path alias to relative imports, fixing resolution in compiled `dist-electron` output.
- **Priority Normalization**: Legacy German priority values (`Hoch`, `Mittel`, `Niedrig`) are automatically migrated to English equivalents (`high`, `medium`, `low`) on database startup.

### Fixed
- **Electron Dev/Prod Window Loading**: Dev URL normalized to include `#/` for `createHashHistory` compatibility. Production uses `electron-serve` with a `loadFile` fallback. Fixes blank window on app start in certain configurations.
- **Detached DevTools**: Added a dedicated `DevTools` `BrowserWindow` toggled via F12 global shortcut, preventing off-screen DevTools restoration issues.
- **MSSQL Error Feedback**: Structured MSSQL error types moved to `shared/errors/mssql.ts` with localized, actionable error messages surfaced in the settings UI.
- **Debug Logs Removed**: Cleaned up `console.log` statements left in production code paths across services and page components.

### Technical Details
- **Tailwind CSS v4**: Migrated from v3 config (`tailwind.config.ts` + `@tailwind` directives) to v4 (`@import "tailwindcss"` + `@theme` block). Removed `postcss` dependency for Tailwind.
- **Dependencies**: Upgraded Radix UI packages, `@tanstack/react-router`, `lucide-react`, `electron-log`, `electron-serve`, `electron-store`. Switched `better-sqlite3` to GitHub source ref `v12.7.1` for Electron 41 compatibility; added `scripts/patch-better-sqlite3.js` to apply a required native binding patch on install.
- **Test Suite**: Comprehensive Jest coverage added — unit tests for services, hooks, and UI components; integration tests for all IPC handler categories; Playwright E2E tests for the Electron app. Coverage scripts added for `unit` and `integration` projects.
- **CI/CD**: GitHub Actions CI workflow added for lint/test/build on push to `main` and pull requests.

---

## [0.1.5] - 2025-10-07

### Added
- **Cross-Platform Git Attributes**: Introduced `.gitattributes` to normalize LF line endings while preserving CRLF for Windows scripts and marking binary assets.

### Changed
- **MSSQL Connectivity**: `mssql-keytar-service` now parses `host\\instance`, `host,port`, and `tcp:` formats, prefers direct host/port connections when configured, and automatically falls back if SQL Browser resolution fails.
- **Diagnostics Surfacing**: IPC handlers, sync service, and API error helpers forward localized messages with actionable suggestions so the settings UI can display root causes and remediation guidance.
- **Settings Experience**: The MSSQL settings page now shows enriched toast messages with suggested fixes when connection tests or sync operations fail.

### Fixed
- **Named Instance Support**: Resolves connection issues when targeting named instances or external servers with fixed ports by retrying with direct TCP connectivity.

### Technical Details
- **Testing Tooling**: Added Jest scripts and dependencies to support targeted Electron and frontend test suites.

---

## [0.1.4] - 2025-08-13

### Added
- **Global Search Enhancements**: Customer and product autocomplete with dedicated combobox components.
- **Optimized Dropdown Endpoints**: Specialized APIs for lightweight selection lists inside the app.

### Changed
- **Sync Performance**: Batch loading of custom field values, optimized database indexes, and upgraded `better-sqlite3` to v12.2.0.
- **Logging & IPC**: Expanded IPC handler logging for clearer diagnostics and refined TypeScript configurations.

### Fixed
- **Developer Tooling**: Prevented Electron from automatically opening DevTools in production builds.

### Technical Details
- **Automation Scripts**: Added performance-testing utilities plus database seeding and cleanup scripts for repeatable local environments.
- **Schema Improvements**: Introduced composite indexes and broader logging/debugging upgrades across 26+ files.

---

## [0.1.3] - 2025-07-15

### Added
- **Customer Numbers**: Added JTL customer number (cKundenNr) support throughout the application
- **Contact Utilities**: New contact utility functions for better phone/email handling and display
- **Grouping System**: Complete grouping functionality for customers and deals with custom field support
- **Dynamic Deal Calculations**: Dynamic value calculation method for deals with updated components
- **Custom Fields Management**: Full custom fields management system in settings
- **Enhanced Logging**: Integrated electron-log for better logging and error handling
- **MSSQL Keytar Service**: Enhanced password management and connection handling
- **Address Fields**: Updated customer data handling, refactored zipCode to zip
- **German Localization**: Updated deal metadata and notes to German language

### Changed
- **Sync Performance**: Parallel data fetching and chunked processing for better sync performance
- **Data Quality**: Active-only customer and product filtering in JTL sync
- **Enhanced Customer Views**: Improved customer display with proper contact prioritization
- **Database Schema**: Added `customerNumber` column to customers table with migration support
- **UI/UX**: Added customer number column to customer tables with proper sorting
- **Contact Display**: Enhanced customer detail page and cards with better contact information display
- **Progress Reporting**: More detailed progress reporting during sync operations

### Fixed
- **Database Queries**: Enhanced address handling in JTL customer sync with fallback mechanisms
- **Error Handling**: Better error handling and logging during sync operations
- **UI Freezing**: Chunked processing prevents UI freezing during large data imports

### Removed
- Authentication system components (actions, routes, private pages)

### Technical Details
- **Database**: Added customerNumber column migration
- **Sync Engine**: Parallel JTL data fetching with chunked processing
- **Performance**: Optimized customer and product queries with proper filtering
- **Code Quality**: Better prepared statement usage for database operations

---

## [0.1.2] - Previous Release
- Base functionality and features

## [0.1.1-beta] - Initial Beta Release
- Initial beta release with core CRM functionality
