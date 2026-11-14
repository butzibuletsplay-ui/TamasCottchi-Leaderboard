export type Trait = 'verspielt' | 'neugierig' | 'verschlafen' | 'frech' | 'anhaenglich';
export const TRAITS: { id: Trait; name: string; hint: string }[] = [
  { id: 'verspielt', name: 'Verspielt', hint: 'Charakterpunkte gibt es nach Toben, Minispielen und Spielzeugaktionen' },
  { id: 'neugierig', name: 'Neugierig', hint: 'Charakterpunkte gibt es nach Erkundung und neuen Weltentdeckungen' },
  { id: 'verschlafen', name: 'Verschlafen', hint: 'Charakterpunkte gibt es nach einem abgeschlossenen Nickerchen' },
  { id: 'frech', name: 'Frech', hint: 'Charakterpunkte gibt es nach spielerischen Interaktionen' },
  { id: 'anhaenglich', name: 'Anhänglich', hint: 'Charakterpunkte gibt es nach Kraulen, Füttern und Pflegen' },
];
export type Personality = Record<Trait, number>;
export const initialPersonality = (): Personality => ({ verspielt: 12, neugierig: 12, verschlafen: 12, frech: 12, anhaenglich: 12 });

/** Slow growth with diminishing returns; other traits drift down a hair so the profile stays readable. */
export function nudge(p: Personality, trait: Trait, amount = 1): Personality {
  const out = { ...p };
  out[trait] = Math.min(100, +(out[trait] + amount * (1 - out[trait] / 120) * 0.7).toFixed(2));
  for (const t of Object.keys(out) as Trait[]) if (t !== trait) out[t] = Math.max(5, +(out[t] - amount * 0.05).toFixed(2));
  return out;
}
export const dominant = (p: Personality): Trait => (Object.entries(p) as [Trait, number][]).sort((a, b) => b[1] - a[1])[0][0];
/** Only show a real character once one trait clearly leads. */
export const hasCharacter = (p: Personality) => { const v = Object.values(p).sort((a, b) => b - a); return v[0] - v[1] >= 4; };

export const IDLE_LINES: Record<Trait, string[]> = {
  verspielt: ['Wirf was! Egal was!', 'Ich hab Hummeln im Fell.', 'Fangen? Fangen!'],
  neugierig: ['Was ist hinter dem Schrank?', 'Riechst du das auch?', 'Ich hab eine Theorie.'],
  verschlafen: ['Kurz die Augen ausruhen…', 'Ist schon Abend?', 'Gähn. Entschuldigung.'],
  frech: ['Ich hab nichts angestellt. Noch.', 'Das Kissen hat angefangen.', 'Wetten, du kriegst mich nicht?'],
  anhaenglich: ['Bleibst du noch ein bisschen?', 'Du bist mein Lieblingsmensch.', 'Nicht weggehen, ja?'],
};
export const FOOD_LINES: Record<Trait, string> = {
  verspielt: 'Schnell essen, dann spielen!', neugierig: 'Hm, wonach schmeckt das genau?', verschlafen: 'Mampf… dann Nickerchen.',
  frech: 'Und wo ist der Nachschlag?', anhaenglich: 'Von dir schmeckt es am besten.',
};
export const FAVORITE_TOY: Record<Trait, string> = { verspielt: 'ball', neugierig: 'frisbee', verschlafen: 'teddy', frech: 'rope', anhaenglich: 'teddy' };
export const TOY_LINES: Record<Trait, string> = {
  verspielt: 'Nochmal! Nochmal!', neugierig: 'Wie fliegt das eigentlich?', verschlafen: 'Okay… aber nur kurz.',
  frech: 'Meins jetzt. Für immer.', anhaenglich: 'Spielen ist schöner mit dir.',
};
export type Surprise = { line: string; coins: number; need?: { glueck?: number; energie?: number } };
export const SURPRISES: Record<Trait, Surprise[]> = {
  verspielt: [{ line: 'Scottchi hat einen alten Ball unterm Sofa gefunden und bringt dir eine Münze mit.', coins: 3, need: { glueck: 4 } }],
  neugierig: [{ line: 'Scottchi hat in der Ritze geschnüffelt und zwei Münzen ausgegraben.', coins: 2 }, { line: 'Scottchi hat eine Socke entdeckt. Riesenfund!', coins: 2, need: { glueck: 3 } }],
  verschlafen: [{ line: 'Scottchi hat ein Mini-Nickerchen gehalten. Etwas Energie zurück.', coins: 1, need: { energie: 5 } }],
  frech: [{ line: 'Scottchi hat heimlich einen Keks stibitzt und gibt dir zur Entschuldigung Münzen.', coins: 3 }],
  anhaenglich: [{ line: 'Scottchi lehnt sich an dich. Einfach so.', coins: 2, need: { glueck: 6 } }],
};
export const IDLE_CLASS: Record<Trait, string> = { verspielt: 'bouncy', neugierig: 'sniff', verschlafen: 'sway', frech: 'tilt', anhaenglich: 'lean' };

export type DayPhase = 'morgen' | 'tag' | 'abend' | 'nacht';
export function dayPhase(d = new Date()): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'morgen';
  if (h >= 11 && h < 18) return 'tag';
  if (h >= 18 && h < 22) return 'abend';
  return 'nacht';
}
export const PHASE_INFO: Record<DayPhase, { name: string; line: string; tip: string }> = {
  morgen: { name: 'Morgen', line: 'Guten Morgen! Neue Aufgaben sind da.', tip: 'Frühstück und frische Tagesaufgaben.' },
  tag: { name: 'Tag', line: 'Der Tag gehört uns!', tip: 'Beste Zeit zum Spielen und Erkunden.' },
  abend: { name: 'Abend', line: 'Langsam werde ich müde…', tip: 'Das Schlafzimmer wird gemütlich. Zeit für Ruhe.' },
  nacht: { name: 'Nacht', line: 'Psst. Eigentlich ist Schlafenszeit.', tip: 'Im Schlafzimmer erholt sich Scottchi am besten.' },
};

/**
 * No punishment for being away. Short absences (incl. hidden tabs) decay normally;
 * long absences preserve needs unchanged, so returning after days never incurs a penalty.
 */
export function absenceDecay(value: number, elapsedMs: number) {
  const ticks = Math.floor(Math.max(0, elapsedMs) / 240000);
  if (elapsedMs <= 20 * 60000) return Math.max(0, value - ticks);
  return value;
}
