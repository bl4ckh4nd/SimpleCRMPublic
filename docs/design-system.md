# Gemeinsame UI-Regeln

Die Desktop-Oberfläche verwendet die vorhandenen Slate-Flächen und Lucide-Icons. Die gemeinsame Quelle ist `src/styles/globals.css`; Komponenten liegen in `src/components/ui`. Kalenderregeln in `src/styles/shadcn-big-calendar.css` ergänzen die zuerst importierten Herstellerstyles.

## Tokens und Primitive

| Bereich | Regel |
| --- | --- |
| Abstand | 4, 8, 12, 16, 24, 32, 48 px; Seite horizontal 24 px, schmal 16 px; vertikal 16 px |
| Schrift | Seitentitel 24/32, Abschnitt 18/24, Unterabschnitt 16/24, Text 14/20, Metadaten 12/16 |
| Dichte | Formulare und Navigation 40 px; Listensteuerung 32 px; kompakte Tabellenzeilen mindestens 40 px |
| Rundung | Klein 4 px, Steuerung 6 px, Flächen und Dialoge 8 px |
| Icons | Standard 16 px, Abschnitt 20 px; Abstand über den Container |
| Dialog | 416, 512 oder 640 px; Abstand 16 px zum nutzbaren Fenster unter der Titelleiste; ein scrollender DialogBody zwischen festem Header und Footer |
| Status | success, warning, info, danger, neutral jeweils mit eigener Fläche und lesbarer Vordergrundfarbe |
| Bewegung | kurze Farb- und Deckkraftwechsel; bei reduzierter Bewegung keine Animation |

`Button`, `Input`, `SelectTrigger`, `Table`, `Badge`, `Dialog`, `AlertDialog`, `PageHeader`, `Breadcrumb` und `TabsList` sind die gemeinsamen Primitive. `Input`, `SelectTrigger` und `Table` erlauben eine feste kontextbezogene Dichte. Checkboxen zeigen ein 16-px-Symbol in einer 32-px-Trefffläche. Bei groben Zeigern werden Treffflächen mindestens 44 px groß.

Detailtabs verwenden `TabsList variant="underline"`; Ansichtswechsel verwenden die vorhandene ToggleGroup. Primäre Erstellen-Aktionen gehören in den PageHeader, Suche und Filter darunter. Beträge sind rechtsbündig mit tabellarischen Ziffern.

## Themen und Navigation

Hell, Dunkel und System werden im gemeinsamen Einstellungsrahmen gewählt und durch next-themes lokal gespeichert. Unter 1024 CSS-Pixeln enthält das Seitenmenü alle acht Hauptbereiche. Die Nachverfolgung zeigt dann Warteschlange, Liste und Details untereinander; auf breiten Fenstern bleiben die drei verstellbaren Bereiche erhalten.

Kalenderfarben bleiben gespeicherte Daten. Symbole kennzeichnen Termin oder Aufgabe anhand von event_type/task_id. Farben behaupten keinen Erledigungsstatus; die Legende beschreibt ausschließlich den Ereignistyp. Transparente Farben werden für die Darstellung auf die Kalenderfläche verrechnet, damit der berechnete Textkontrast zur tatsächlich gezeichneten Fläche passt; gespeicherte Farbwerte bleiben erhalten.

## Zustände und Daten

Ladefehler sind keine leeren Ergebnisse. Seitenüberschrift und zuletzt erfolgreich geladene Daten bleiben bei erneuten Lesefehlern erhalten. Erneute Versuche sind während des laufenden Versuchs gesperrt. Veraltete Antworten betroffener Leser werden ignoriert; IPC-Aufrufe werden dadurch nicht transportseitig abgebrochen.

Nicht verfügbare benutzerdefinierte Felddefinitionen verändern keine vorhandenen Werte und sperren das betroffene Speichern bis zum erfolgreichen Nachladen. Löschfehler schließen die Bestätigung nicht. Der Kalender zeigt Verschiebungen und Größenänderungen erst nach einer erfolgreichen Speicherantwort an; sein bestehender Renderer-Adapter überträgt all_day für diesen SQLite-Pfad als 1 oder 0. Labels, Icon-Aktionen und Auswahlfelder benötigen zugängliche Namen; Fokus muss sichtbar bleiben.

## Prüfung

`pnpm run typecheck` und `pnpm run build` prüfen die gemeinsame Implementierung. Die hermetischen Electron-Journeys unter `tests/e2e` prüfen bestehende CRUD-Abläufe, Dialoggrenzen, Themen, echte Electron-Vergrößerung und Wiederholung nach Lesefehlern. `tests/e2e/ui-consistency.spec.ts` hängt Screenshots an den HTML-Bericht unter `playwright-report` an; Fehlertraces liegen in `test-results`. Diese Prüfungen benötigen keinen echten MSSQL-Server.
