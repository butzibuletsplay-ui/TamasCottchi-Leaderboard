import type { NeedKey, Room } from './data';

export type PetAction = 'idle' | 'happy' | 'eating' | 'washing' | 'petting' | 'sleeping' | 'spin' | 'wiggle' | 'run' | 'chew' | 'wake' | 'yawn' | 'cuddle';
export type ToyUse = {
  action: PetAction;
  line: string;
  fx: 'throw' | 'arc' | 'bounce' | 'shake';
  need: Partial<Record<NeedKey, number>>;
  energy?: number;
  freq: number;
  slide?: number;
  room?: Room;
  cooldown: number;
};

export const TOY_USE: Record<string, ToyUse> = {
  ball: { action: 'run', line: 'Ball! Ball! BALL!', fx: 'throw', need: { glueck: 12, energie: -5 }, energy: 10, freq: 700, cooldown: 15, room: 'Spielzimmer' },
  'bone-toy': { action: 'chew', line: 'Knusper. Meins.', fx: 'bounce', need: { glueck: 14, hunger: 3 }, freq: 520, cooldown: 20 },
  duck: { action: 'happy', line: 'Was war DAS?', fx: 'bounce', need: { glueck: 6 }, freq: 1300, slide: 700, cooldown: 6 },
  rope: { action: 'wiggle', line: 'Grrr, ich gewinne!', fx: 'shake', need: { glueck: 16, energie: -7 }, energy: 12, freq: 380, cooldown: 25 },
  frisbee: { action: 'run', line: 'Ich fliege fast mit!', fx: 'arc', need: { glueck: 14, energie: -6 }, energy: 12, freq: 820, slide: 1100, cooldown: 20, room: 'Spielzimmer' },
  teddy: { action: 'cuddle', line: 'Mein bester Freund.', fx: 'bounce', need: { glueck: 9, energie: 2 }, freq: 460, cooldown: 20 },
  shampoo: { action: 'washing', line: 'Duftet nach Kokos!', fx: 'shake', need: { sauberkeit: 45, glueck: 3 }, freq: 760, room: 'Bad', cooldown: 90 },
  'crafted-toy': { action: 'wiggle', line: 'Das ist selbst gemacht! Noch eine Runde!', fx: 'shake', need: { glueck: 18, energie: -7 }, energy: 12, freq: 400, cooldown: 25 },
  'crafted-shell-rattle': { action: 'wiggle', line: 'Das klingt wie ein kleiner Strand!', fx: 'shake', need: { glueck: 14, energie: -4 }, energy: 8, freq: 610, cooldown: 18 },
  'crafted-gem-ball': { action: 'run', line: 'Der glitzert sogar beim Rollen!', fx: 'throw', need: { glueck: 16, energie: -5 }, energy: 9, freq: 740, cooldown: 20 },
  'crafted-bone-puzzle': { action: 'chew', line: 'Ein Knochen mit kniffligem Muster!', fx: 'bounce', need: { glueck: 15, hunger: 2 }, freq: 480, cooldown: 18 },
  'crafted-leaf-frisbee': { action: 'run', line: 'Einmal durch den Blätterwirbel!', fx: 'arc', need: { glueck: 14, energie: -5 }, energy: 10, freq: 790, cooldown: 20, room: 'Spielzimmer' },
  'crafted-fossil-chew': { action: 'chew', line: 'Ein Fundstück zum Anknabbern!', fx: 'bounce', need: { glueck: 17, hunger: 2 }, freq: 440, cooldown: 24 },
  'crafted-ore-toy': { action: 'happy', line: 'Das klappert schön!', fx: 'bounce', need: { glueck: 12 }, freq: 900, slide: 650, cooldown: 15 },
};

export const CONSUMABLE_TOY_IDS = Object.keys(TOY_USE);

export function consumeToyStock(inventory: Record<string, number>, id: string): Record<string, number> | null {
  const rawCount = inventory[id];
  const count = Number.isFinite(rawCount) ? Math.floor(rawCount) : 0;
  if (!CONSUMABLE_TOY_IDS.includes(id) || count < 1) return null;
  return { ...inventory, [id]: count - 1 };
}
