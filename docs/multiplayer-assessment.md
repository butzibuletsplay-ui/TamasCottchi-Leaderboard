# tamascottchi: Multiplayer-Einschätzung

Stand: 13. November 2026. **Analyse, nicht implementiert. Es wurden keine kostenpflichtigen Dienste eingerichtet.**

## Ausgangslage

Das Spiel ist eine React/Vite-Anwendung mit lokalen Browser-Spielständen. Die Bestenliste ist lokal. Im Workspace gibt es bereits einen Express-Server und eine PostgreSQL/Drizzle-Struktur, aber derzeit keine Spielerprofile, Anmeldung, Freundschaften oder autoritative Spielwirtschaft.

Die vorhandene Struktur ist eine sinnvolle Grundlage. Eine zweite Plattform ist für die erste Online-Version nicht erforderlich.

## Empfohlene erste Version

1. Sichere Anmeldung über einen verwalteten Authentifizierungsanbieter.
2. Online-Profil mit Spielername, Scottchi-Name, freigegebenem Aussehen und zufälligem Freundescode.
3. Freundschaftsanfrage mit Annahme/Ablehnung, Entfernen und Blockieren.
4. Besuch des gespeicherten Zimmers eines bestätigten Freundes; beide Figuren werden angezeigt.
5. Vordefinierte Aktionen: Winken, Tanzen, gemeinsam Spielen. Keine Freitexte und kein öffentlicher Chat.

Besuche funktionieren zunächst asynchron: Ein Freund muss nicht gleichzeitig online sein. Neue Aktionen können während eines geöffneten Besuchs etwa alle zehn Sekunden abgefragt werden; bei unsichtbarem Tab pausieren. Das ist einfacher und ressourcenschonender als permanente Echtzeitverbindungen.

Nicht Teil dieser ersten Version: gemeinsame Echtzeit-Minispiele, handelbare Münzen, frei übertragbare Gegenstände, öffentliche Profile mit beliebigen Uploads.

## Daten und Sicherheit

- PostgreSQL-Tabellen für Profile, bestätigte Freundschaften/Anfragen, Raumdarstellung, zulässige Interaktionen und Blockierungen.
- Besitzerprüfung bei jeder Änderung; Besuchsdaten nur für bestätigte Freunde.
- Freundescodes ausreichend lang und zufällig; Suche, Anfragen und Aktionen begrenzen.
- Anzeigenamen begrenzen und filtern; keine E-Mail-Adressen im öffentlichen Profil.
- Aktionen serverseitig erlauben und durch Cooldowns sowie eindeutige Anfrage-IDs gegen Wiederholung absichern.
- Bei späteren Geschenken: Inventaränderungen atomar in einer Datenbanktransaktion, mit Mengenlimits und eindeutiger Transaktions-ID.
- Löschung und Export von Online-Daten, Aufbewahrungsfristen und Datenschutzhinweise vor Veröffentlichung festlegen. Für Minderjährige sind zusätzliche rechtliche und produktspezifische Entscheidungen nötig.
- Verbindungsabbruch: lesbare Fehlermeldung, Wiederholung mit derselben Anfrage-ID, keine doppelte Vergabe; lokales Pflegespiel bleibt nutzbar.

**Wichtig:** LocalStorage ist vom Spieler veränderbar. Lokale Münzen, XP und Rekorde dürfen nicht ungeprüft als vertrauenswürdige Online-Werte übernommen werden. Bestehende lokale Fortschritte bleiben erhalten; Online-Wettbewerbe brauchen getrennte, serverseitig validierte Ergebnisse. Ein kosmetischer Import kann als nicht gewertet gekennzeichnet werden. Keine stillschweigende Enteignung alter Käufe.

## Technologievergleich

| Ansatz | Eignung und Grenzen |
|---|---|
| Bestehendes Express + PostgreSQL + HTTP-Abfragen | Empfehlung für Profile, Freundescodes und asynchrone Besuche. Wenig zusätzliche Infrastruktur. Kurze Polling-Verzögerung statt Echtzeit. |
| WebSockets oder Socket.IO | Für gemeinsame Anwesenheit und Duelle. Socket.IO erleichtert Wiederverbindung und Räume, ersetzt aber keine Validierung. Benötigt einen passenden laufenden Server, korrekte Proxy-Routen, Ablaufzeiten und Wiederverbindungslogik. |
| Supabase | Alternative mit Auth, Datenbank und Realtime; bringt zusätzliche Anbieter-, Tarif- und Zugriffskontrollkonfiguration. Kein Grund, die vorhandene Datenbank nur dafür zu ersetzen. Tarif vor Entscheidung separat prüfen. |
| Reservierter Server | Vorhersehbarer laufender Prozess für einen kleinen Echtzeit-Prototypen. Bei mehreren Instanzen müssen Sitzungen/Spielräume koordiniert werden; ein prozesslokaler Speicher reicht dann nicht. |

Echtzeit-Spielzustand nicht 60-mal pro Sekunde in PostgreSQL speichern. Der Server verwaltet eine Sitzung; Clients rendern flüssig lokal, übertragen reduzierte Eingaben/Zustandsdaten und speichern nur notwendige Ergebnisse.

## Gemeinsame Minispiele

- **Memory-Duell:** Als erstes geeignet. Abwechselnde Züge, Karten und Zugberechtigung auf dem Server. Ein Abbruch lässt sich über eine Zugfrist behandeln.
- **Snack-Catch-Duell:** Zunächst identische serverseitig vorgegebene Runde, getrennte Spielfelder und abschließender Vergleich. Gemeinsame Echtzeitphysik ist deutlich aufwendiger.
- **Scottchi-Run-Race:** Zuerst asynchroner Vergleich desselben Hindernis-Seeds. Für echte Rennen später Serverzeit, Eingabeprüfung und tolerante Synchronisation ergänzen.

Ein zufälliger Seed allein verhindert Manipulation nicht. Wettbewerbliche Ergebnisse benötigen serverseitige Simulation oder Plausibilitätsprüfung, Zeitlimits und Schutz vor wiederholten Ergebnisübermittlungen.

## Kosten: nachvollziehbare Beispielrechnung

Quelle: [Replit – Cloud Aug 2026 Pricing Updates](https://docs.replit.com/billing/aug-cloud-billing-updates), am 13. November 2026 abgefragt.

Genannte Listenpreise in USD, vor Steuern, Guthaben oder individuellen Tarifen:

- Autoscale: **$1/Monat Grundpreis**, **$0,60 je Million Compute Units**, **$0,40 je Million Requests**.
- Ausgehender Datenverkehr: **$0,05/GiB**.
- Datenbank: **$0,16 je Compute-Stunde**, **$0,35/GiB-Monat Speicher**.
- Reserved VM 0,25 vCPU / 1 GiB: **$0,0104/Stunde**, etwa **$7,59 bei 730 Stunden**.
- Reserved VM 0,5 vCPU / 2 GiB: **$0,0208/Stunde**, etwa **$15,18 bei 730 Stunden**.

**Beispiel, keine Verbrauchsprognose:** Bei 1 Million Compute Units, 100.000 Requests und 1 GiB ausgehendem Traffic ergeben sich rund $1,69 für Autoscale. Dazu kommen Datenbank und gegebenenfalls Authentifizierung. Bei 20 Datenbank-Compute-Stunden und 1 GiB Speicher wären das weitere $3,55; zusammen etwa $5,24. Das Ergebnis gilt nur, wenn diese Verbrauchsannahmen tatsächlich zutreffen.

Eine dauerhaft aktive Datenbank mit 730 abgerechneten Compute-Stunden läge dagegen rechnerisch bei **$116,80 allein für Compute**. Kleine Nutzerzahlen garantieren daher keine kleinen Kosten. Tatsächliche Aktivitäts-/Abrechnungszeiten, Verbindungspooling und Hintergrundabfragen sind entscheidend.

Ein kleiner reservierter Echtzeitserver startet rechnerisch bei $7,59 bzw. $15,18 monatlich, **zuzüglich** Datenbank, Datenverkehr und Authentifizierung. Die kleinste VM ist keine zugesicherte Kapazitätsempfehlung: vorher messen.

Authentifizierungsanbieter, Nutzungslimits und eventuell nötiger Tarif werden vor Einrichtung geprüft. Keine kostenlose Produktionsgarantie. Mit einem begrenzten Testkreis starten, Nutzung messen und Ausgaben überwachen.

## Aufwand und Entscheidung

Grobe technische Schätzung, kein Festpreis:

- Profile, Anmeldung, Freundescodes, asynchrone Besuche und feste Aktionen einschließlich Sicherheits-/Abbruchtests: etwa **8–15 Entwicklertage**.
- Memory-Duell: weitere **4–7 Tage**.
- Robuste Echtzeit-Actionduelle: je nach Anspruch mehrere zusätzliche Wochen.

Empfehlung: **Erste Online-Version mit Freundescodes, bestätigten Freunden und asynchronen Besuchen auf dem vorhandenen Server.** Erst nach Zustimmung Anbieter, Tarif und Budget festlegen und implementieren. Anschließend Memory-Duell als erste echte Mehrspieler-Erweiterung.
