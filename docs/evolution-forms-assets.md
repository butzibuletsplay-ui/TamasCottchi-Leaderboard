# Tamascottchi: manuelle Entwicklung

## Stufen und Coin-Kosten

Entwicklung ist eine ausdrückliche, einmalige Aktion im Charakterbereich unter **Schrank → Entwicklung**. Spielerlevel, Pflege, Spielzeit und XP ändern die Form nicht. Jede bestätigte Stufe zieht ihre Kosten ab, speichert die neue Stufe und schaltet die nächste Stufe erst danach frei.

| Stufe | Form | Spielerlevel | Einmalige Kosten |
|---:|---|---:|---:|
| 1 | Ei | 1 | kostenlos |
| 2 | Schlüpfling | 10 | 500 |
| 3 | Jungtier | 25 | 2.000 |
| 4 | Entdecker | 50 | 6.000 |
| 5 | Abenteurer | 100 | 15.000 |
| 6 | Naturgeist | 175 | 35.000 |
| 7 | Zauberwesen | 275 | 75.000 |
| 8 | Sternenwesen | 400 | 150.000 |
| 9 | Königliches Wesen | 600 | 300.000 |
| 10 | Ultimative Form | 850 | 600.000 |

Die Gesamtkosten aller bezahlten Stufen betragen 1.183.500 Münzen. Zur Einordnung anhand der bestehenden maximalen Minispiel-Tageslimits:

| Stufe | Kosten | Max. Minispiel-Münzen am Freischaltlevel | Volle Tageslimits |
|---:|---:|---:|---:|
| 2 | 500 | 11.000 | 0,05 |
| 3 | 2.000 | 12.500 | 0,16 |
| 4 | 6.000 | 15.000 | 0,40 |
| 5 | 15.000 | 20.000 | 0,75 |
| 6 | 35.000 | 27.500 | 1,27 |
| 7 | 75.000 | 37.500 | 2,00 |
| 8 | 150.000 | 50.000 | 3,00 |
| 9 | 300.000 | 70.000 | 4,29 |
| 10 | 600.000 | 95.000 | 6,32 |

Das sind Obergrenzen, keine garantierten täglichen Einnahmen. Aufgaben, Meilensteine und Weltbelohnungen können weitere Münzen geben; Einnahmen hängen vom tatsächlichen Spielen ab. Die vorgegebenen Kosten bleiben daher als Startwerte erhalten: frühe Formen sind erschwinglich, spätere Formen bleiben ein langfristiges Ziel. Es gibt keine XP- oder Coin-Multiplikatoren aus Evolutionen. Level 1000 bleibt das globale Maximum, aber die letzte Form wird bereits auf Level 850 freigeschaltet.

## Migration und Speicherung

- Die neue Spielstandversion speichert die erreichte Form als `evolutionStage`.
- Alte Saves ohne ein bisheriges Evolutionsfeld beginnen bei Stufe 1; ihr Level allein schaltet keine Form frei. Bestehende Münzen, XP, Kleidung, Gegenstände und Weltfortschritt bleiben erhalten.
- Ein schon gespeichertes gültiges Evolutionsstadium wird beibehalten.
- Vor der Migration wird eine unveränderte Sicherung des alten Spielstands angelegt.
- Jede bezahlte Stufe wird einzeln bestätigt und kann durch den nächsten Stufenwert nicht ein zweites Mal gekauft werden.
- Online-Spielstände behalten das Evolutionsstadium bei der normalen Synchronisierung.

Im bisherigen Projekt gab es keine gespeicherte Evolutionsstufe und keine automatische Formentwicklung. Die Persönlichkeitswerte aus Pflege und Spiel bleiben unverändert; sie entwickeln keine Form weiter.

## Fehlende Formgrafiken

Im Projekt liegen derzeit sieben Stimmungsbilder (`default`, `happy`, `hungry`, `tired`, `dirty`, `sad`, `excited`) für denselben Scottchi-Körper. Es gibt keine separaten Formgrafiken. Bis passende Zeichnungen vorliegen, nutzt die Entwicklung diese vorhandenen Bilder mit abgestuften Auren und Animationen. Dauerhafte Emoji-Platzhalter werden nicht verwendet.

Für echte, kleidungskompatible Formwechsel fehlen:

1. Ein Scottchi-Ei mit klar wiedererkennbaren Charaktermerkmalen.
2. Je eine konsistente Körpergrafik für Schlüpfling, Jungtier, Entdecker, Abenteurer, Naturgeist, Zauberwesen, Sternenwesen, Königliches Wesen und Ultimative Form.
3. Für jede Form die sieben vorhandenen Stimmungen, im gleichen transparenten Format, Seitenverhältnis (436 × 487) und mit passenden Gesichts-/Kleidungsankern.
4. Eine passende Transformationssequenz oder Sprite-Animation für jede Evolutionsstufe; spätere Stufen dürfen stärkere Effekte haben.

Die schon vorhandenen kosmetischen Evolutionsbelohnungen bleiben ohne zusätzliche Charaktergrafiken nutzbar: Stufe 4 schaltet den Heldenumhang im Kleiderschrank frei, Stufe 7 eine Zimmerdekoration. Weitere Effekte sind Animationen, Auren und auf Stufe 10 der Titel „Ultimative Pfote“.
