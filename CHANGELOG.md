# Changelog

All notable changes to SimpleCRM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
