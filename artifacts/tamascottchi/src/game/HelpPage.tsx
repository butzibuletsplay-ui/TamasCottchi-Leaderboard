import { CircleHelp, Compass, Gamepad2, Hammer, ShieldCheck, Smartphone } from 'lucide-react';

export function HelpPage() {
  return <section className="panel help-page" data-testid="help-page">
    <div className="panel-head"><div><div className="eyebrow">KURZ ERKLÄRT</div><h2 className="panel-title">Hilfe & Spielstart</h2></div><CircleHelp size={19}/></div>
    <div className="help-grid">
      <article><Gamepad2/><h3>Scottchi versorgen</h3><p>Füttern, baden, kraulen und spielen verändern die Bedürfnisse. In der Küche wählst du Futter; Shampoo funktioniert im Bad und wird verbraucht.</p></article>
      <article><Compass/><h3>Welt erkunden</h3><p>Wähle einen erreichbaren Ort und starte dort eine Aufgabe. Sammelstellen erneuern sich nach 24, 48 oder 72 Stunden; Tagesziele und NPC-Aufträge wechseln um 04:00 Uhr Berliner Zeit, Wochenziele am Montag.</p></article>
      <article><Hammer/><h3>Inventar & Werkstatt</h3><p>Funde liegen im Inventar. Stelle daraus Werkzeuge, Snacks und Zimmerdeko her. Der Frisbee wird im Spielzimmer per Wischbewegung geworfen.</p></article>
      <article><Smartphone/><h3>Minispiele & Touch</h3><p>Ziehe Scottchi in Snack Catch, tippe Ziele in Turbo Tap und Memory an und wische in Scottchi Run. Ziehe die Karte mit einem Finger.</p></article>
      <article><ShieldCheck/><h3>Spielstand & Datenschutz</h3><p>Der Spielstand liegt lokal und kann nach Anmeldung zusätzlich in der Cloud gesichert werden. Exportiere ihn regelmäßig als Sicherung. Freunde und gemeinsamer Multiplayer sind noch nicht aktiv.</p></article>
    </div>
    <div className="side-note help-online"><strong>Cloud-Sicherung ja · Multiplayer noch nicht</strong>Wenn du angemeldet bist, verwendet die Welt die Serverzeit. Sammelbelohnungen werden weiterhin lokal im Spielstand verwaltet; gemeinsame Fundstellen oder Freundebesuche gibt es noch nicht.</div>
    <p className="help-version">tamascottchi · Spielversion 6.1</p>
  </section>;
}
