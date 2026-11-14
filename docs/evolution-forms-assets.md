# Tamascottchi: manuelle Entwicklung

## Stufen und Coin-Kosten

Entwicklung ist eine ausdrückliche, einmalige Aktion im Charakterbereich unter **Schrank → Entwicklung**. Spielerlevel, Pflege, Spielzeit und XP ändern die Form nicht. Jede bestätigte Stufe zieht ihre Kosten ab, speichert die neue Stufe und schaltet die nächste Stufe erst danach frei.

| Stufe | Form | Spielerlevel | Einmalige Kosten |
|---:|---|---:|---:|
| 1 | Original Scotchi | 1 | kostenlos |
| 2 | Sprössling Scotchi | 10 | 500 |
| 3 | Entdecker Scotchi | 25 | 2.000 |
| 4 | Magischer Scotchi | 50 | 6.000 |
| 5 | Blumen Scotchi | 100 | 15.000 |
| 6 | Naturwächter Scotchi | 175 | 35.000 |
| 7 | Sternenkristall Scotchi | 275 | 75.000 |
| 8 | Himmlischer Scotchi | 400 | 150.000 |
| 9 | Königlicher Scotchi | 600 | 300.000 |
| 10 | Transzendenter Scotchi | 850 | 600.000 |

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
- Die höchste freigeschaltete Stufe (`evolutionStage`) und die aktive Form (`activeEvolutionStage`) werden getrennt gespeichert.
- Alte Saves ohne ein bisheriges Evolutionsfeld beginnen bei Stufe 1; ihr Level allein schaltet keine Form frei. Bestehende Münzen, XP, Kleidung, Gegenstände und Weltfortschritt bleiben erhalten.
- Vorhandene Fortschritte aus der vorigen Version werden beibehalten; falls noch keine Form ausgewählt gespeichert ist, wird die höchste freigeschaltete Form aktiviert.
- Eine aktive Form kann kostenlos auf jede niedrigere, bereits freigeschaltete Form zurückgestellt werden.
- Vor der Migration wird eine unveränderte Sicherung des alten Spielstands angelegt.
- Jede bezahlte Stufe wird einzeln bestätigt und kann durch den nächsten Stufenwert nicht ein zweites Mal gekauft werden.
- Online-Spielstände behalten das Evolutionsstadium bei der normalen Synchronisierung.

Im bisherigen Projekt gab es keine gespeicherte Evolutionsstufe und keine automatische Formentwicklung. Die Persönlichkeitswerte aus Pflege und Spiel bleiben unverändert; sie entwickeln keine Form weiter.

## Integrierte Formgrafiken

Alle zehn transparenten 1254 × 1254-PNGs sind direkt aus den hochgeladenen Dateien eingebunden, in der vorgegebenen Reihenfolge:

1. Original: `9F565728-1506-4265-B4FC-AB66189F9024_1794669072942.png`
2. Sprössling: `7A1344AA-7099-4162-B91F-1C8878AFB393_1794669072942.png`
3. Entdecker: `92D59578-2EE2-4A20-A72D-D9F0EF557A63_1794669072942.png`
4. Magisch: `BCC410E4-FBE0-49A4-B7AC-8966418AD851_1794669072942.png`
5. Blumen: `031AEEDE-35AB-462A-BB2B-46C093B18B89_1794669072942.png`
6. Naturwächter: `93F3AFC6-AF47-4813-B9A2-35E5CEE704EE_1794669072942.png`
7. Sternenkristall: `EACC95D2-D52A-4A2C-B8C0-EB5D33F85B14_1794669072942.png`
8. Himmlisch: `E5C67D88-4927-4439-968F-EB3578D3C68B_1794669072942.png`
9. Königlich: `0AA10B07-C065-49CE-917E-44AAAF42798D_1794669072942.png`
10. Transzendent: `CF363CD3-49AC-4F2D-8EC6-32282425EA14_1794669072942.png`

Die zentrale Charakterkomponente verwendet die aktive Form zuhause, in der Charaktervorschau, im Pflegebereich, bei Spielzeugaktionen und im Evolutionsmenü. `object-fit: contain` erhält das quadratische Originalformat; die Bilder werden bei Bedarf verzögert geladen. Es wird keine Grafik neu erzeugt oder überschrieben.

Jede Form enthält bereits ihre eigenen Accessoires. Deshalb werden zusätzliche Outfit-/Hut-Overlays auf diesen Bildern nicht gerendert, damit sie nicht falsch sitzen. Ausgerüstete Kleidungsstücke und der Inventarbesitz bleiben unverändert erhalten; die bestehende Outfit-Werkstatt zeigt weiterhin den separaten, mit Kleidungslayern ausgestatteten Basis-Charakter.
