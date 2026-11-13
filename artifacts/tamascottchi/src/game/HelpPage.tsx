import { CircleHelp, Compass, Gamepad2, Hammer, ShieldCheck, Smartphone } from 'lucide-react';

export function HelpPage() {
  return <section className="panel help-page" data-testid="help-page">
    <div className="panel-head"><div><div className="eyebrow">KURZ ERKLÄRT</div><h2 className="panel-title">Hilfe & Spielstart</h2></div><CircleHelp size={19}/></div>
    <div className="help-grid">
      <article><Gamepad2/><h3>Scottchi versorgen</h3><p>Füttern, baden, kraulen und spielen verändern die Bedürfnisse. In der Küche wählst du Futter; Shampoo funktioniert im Bad und wird verbraucht.</p></article>
      <article><Compass/><h3>Welt erkunden</h3><p>Wähle einen erreichbaren Ort und starte dort eine Aufgabe. Tippe die Karte an, damit Scottchi dorthin läuft, und tippe jedes Suchziel nur einmal an.</p></article>
      <article><Hammer/><h3>Inventar & Werkstatt</h3><p>Funde liegen im Inventar. Stelle daraus Werkzeuge, Snacks und Zimmerdeko her. Der Frisbee wird im Spielzimmer per Wischbewegung geworfen.</p></article>
      <article><Smartphone/><h3>Minispiele & Touch</h3><p>Ziehe Scottchi in Snack Catch, tippe Ziele in Turbo Tap und Memory an und wische in Scottchi Run. Ziehe die Karte mit einem Finger.</p></article>
      <article><ShieldCheck/><h3>Spielstand & Datenschutz</h3><p>Der Spielstand liegt in diesem Browser. Exportiere ihn regelmäßig als Sicherung. Importierte Dateien werden geprüft. Es gibt keine Konten, echten Freunde oder Online-Spieler.</p></article>
    </div>
    <div className="side-note help-online"><strong>Online-Funktionen sind nicht aktiviert</strong>Die Online-Seite ist nur ein Hinweis. Es werden keine Freundescodes, Besuche oder Profile simuliert und es werden keine Daten an einen Multiplayer-Dienst gesendet.</div>
    <p className="help-version">tamascottchi · Spielversion 4.0</p>
  </section>;
}
