---
name: Spielstände und Multiplayer-Freigabe
description: Verbindliche Grenzen für Erweiterungen von tamascottchi
---

Bestehendes tamascottchi erweitern, keine neue Website erstellen. Vorhandene Funktionen, Spielstände, Währungen, Level, Shops und gekaufte Gegenstände erhalten.

**Why:** Der Nutzer verlangt dies ausdrücklich in seinem Update-Brief.

**How to apply:** Speicheränderungen rückwärtskompatibel ausführen und vor Migration den alten Spielstand sichern.

Bedürfnisse entwickeln sich nach echter Zeit weiter, auch wenn das Spiel mehrere Tage geschlossen ist; Scottchi darf dadurch nicht sterben.

**Why:** Die spätere Überarbeitung des Bedürfnissystems verlangt ausdrücklich Offline-Simulation, ohne Tod des Haustiers.

**How to apply:** Beim Laden einmalig anhand gespeicherter Zeitstempel simulieren und alle Werte auf 0–100 begrenzen; längere Offline-Zeit darf Bedürfnisse senken, aber keine Besitztümer oder Charakterpunkte löschen.

Multiplayer zunächst analysieren und nicht ohne Zustimmung vollständig implementieren. Vor kostenpflichtigen Diensten oder größerer Multiplayer-Infrastruktur Lösungen, Kosten und Einschränkungen erklären. Keine unmoderierten öffentlichen Chats; bevorzugt Freundescodes und feste Interaktionen.

**Why:** Der Nutzer setzt diese Freigabe- und Sicherheitsgrenzen ausdrücklich.

**How to apply:** Online-Erweiterungen erst nach Zustimmung einrichten; Analyse unter `docs/multiplayer-assessment.md` als Ausgangspunkt nutzen und Preise erneut prüfen.
