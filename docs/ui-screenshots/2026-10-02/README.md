# UI-Screenshots – 2. Oktober 2026

86 PNG-Aufnahmen der überarbeiteten Electron-Oberfläche. [Galerie öffnen](index.html).

Die Aufnahmen stammen aus dem lokalen Produktionsbuild mit einer eigenen SQLite-Testdatenbank unter /tmp/simplecrm-screens/data. Alle Namen, Unternehmen und Kontaktdaten sind fiktiv. Die normale Benutzerdatenbank wurde nicht verwendet.

Enthalten sind alle 13 Seiten einschließlich Kunden- und Deal-Details, Kanban, vier Kalenderansichten, Erstellen-Dialoge, benutzerdefinierte Kundenfelder, Aufgabendetails, Aktivitätsdialog, Löschbestätigung, Aktionsmenü und Ausschnitte von Navigation, Tabellen und Detailtabs – jeweils in Hell und Dunkel.

Standardaufnahmen: 1440 × 1000 CSS-Pixel. Zusätzlich: Kundendialog bei 1024 × 600 und Nachverfolgung/Navigation bei 768 × 900. Die schmalen Aufnahmen verwenden die CDP-Viewport-Emulation in derselben Electron-Instanz; sie sind keine Aufnahmen eines Mobilgeräts. Komponenten-PNGs zeigen den jeweiligen Elementausschnitt. Reduzierte Bewegung war aktiviert.

## Dashboard-Zustände

Die Dateien *01-dashboard.png zeigen einen realen Lesefehler mit offenen Aufgaben: electron/sqlite-service.ts:getUpcomingTasks liefert completed nicht mit, obwohl shared/ipc/channels.ts das Feld in der Task-Antwort verlangt. Für diese Dokumentation wurde der Anwendungscode nicht verändert und keine Antwort simuliert.

Die Dateien *dashboard-erledigte-aufgaben.png zeigen denselben Datenbestand, nachdem die drei Demo-Aufgaben über den bestehenden IPC-Endpunkt erledigt wurden. Danach wurde ihr offener Zustand wiederhergestellt.

Der Lesefehler ist im Release-Kandidaten 0.3.0 behoben. Das aktuelle Dashboard mit offenen Demo-Aufgaben steht in assets/screenshots/dashboard.png und im Projekt-README. Die Galerie bewahrt die vorherige Aufnahme als dokumentierten Fehlerzustand.

## Dateien prüfen

manifest.json enthält für jedes PNG Abmessungen und SHA-256. Alle PNGs wurden auf Lesbarkeit geprüft. In der Galerie öffnet ein Klick das Originalbild.
