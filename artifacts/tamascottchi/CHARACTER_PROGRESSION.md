# Charakterpunkte und Evolution

## Spielregeln

- Die fünf vorhandenen Charakterzüge bleiben unverändert: Verspielt, Neugierig, Verschlafen, Frech und Anhänglich.
- Die bisherigen 0–100-Persönlichkeitswerte steuern weiterhin Verhalten und Dialoge. Charakterpunkte sind ein eigener, dauerhafter Fortschritt und sinken nicht.
- Erfolgreiche Aktionen vergeben zwei Punkte. Ein gemeinsames serverseitiges Limit von 100 Punkten und eine globale Pause von 20 Sekunden gelten für alle Charakterzüge zusammen.
- Toben, Minispiele und Spielzeuge steigern Verspielt; Erkundung und Entdeckungen Neugierig; ein abgeschlossenes Nickerchen Verschlafen; spielerische Interaktionen Frech; Kraulen, Füttern und Baden Anhänglich.
- Das Tageslimit wird um Mitternacht in `Europe/Berlin` zurückgesetzt. Spielaktionen und Pflege bleiben auch ohne Konto verfügbar; Charakterpunkte und neue Evolutionen benötigen ein verknüpftes Konto.
- Für jede Evolution müssen Level, Münzen und der geforderte Punktestand in allen fünf Charakterzügen erreicht sein. Evolutionen verbrauchen keine Charakterpunkte; bereits freigeschaltete Formen bleiben erhalten.

## Faire Migration

Alte Spielstände enthalten keine Charakterpunkte. Beim ersten Laden werden ihre vorhandenen 0–100-Werte einmalig und unverändert in die gleichnamigen Charakterzüge übernommen; jeder Wert bleibt auf 100 begrenzt. Das erhält vorhandenen Fortschritt, ohne alte Werte in größere Punktzahlen umzuwandeln.

Beim ersten Cloud-Import akzeptiert der Server keine vom Client eingereichten Charakterpunkt-Summen. Er übernimmt nur die genannten alten Persönlichkeitswerte. Danach sind Charakterpunkte, Tageslimit und Evolutionskäufe serverseitig maßgeblich. Eine Schema-14-Sicherung wird vor der lokalen Migration unverändert angelegt.

## Balancing

Mit zwei Punkten pro erfolgreicher Aktion und 20 Sekunden globalem Abstand dauern 50 Punkteaktionen mindestens 16 Minuten und 40 Sekunden; die nötigen Spielaktionen kommen hinzu. Damit liegt das 100-Punkte-Tageslimit im gewünschten Bereich von ungefähr 15–30 Minuten.

Bei gleichmäßiger Verteilung auf alle fünf Züge entsprechen die Anforderungen folgenden kumulierten Mindestzeiten ab null Punkten: Form 2 nach 5 Tagen, Form 3 nach 13, Form 4 nach 25, Form 5 nach 45, Form 6 nach 75, Form 7 nach 115, Form 8 nach 165, Form 9 nach 225 und Form 10 nach 300 Tagen. Das Gesamtlimit ist für jeden Zug gemeinsam; keine einzelne Eigenschaft hat ein höheres Tageslimit oder einen Level-Multiplikator. Übernommene Altwerte verkürzen die ersten Etappen.
