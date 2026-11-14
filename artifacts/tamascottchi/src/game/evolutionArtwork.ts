import originalScotchi from '@assets/9F565728-1506-4265-B4FC-AB66189F9024_1794669072942.png';
import sproutScotchi from '@assets/7A1344AA-7099-4162-B91F-1C8878AFB393_1794669072942.png';
import explorerScotchi from '@assets/92D59578-2EE2-4A20-A72D-D9F0EF557A63_1794669072942.png';
import magicScotchi from '@assets/BCC410E4-FBE0-49A4-B7AC-8966418AD851_1794669072942.png';
import flowerScotchi from '@assets/031AEEDE-35AB-462A-BB2B-46C093B18B89_1794669072942.png';
import natureGuardianScotchi from '@assets/93F3AFC6-AF47-4813-B9A2-35E5CEE704EE_1794669072942.png';
import starCrystalScotchi from '@assets/EACC95D2-D52A-4A2C-B8C0-EB5D33F85B14_1794669072942.png';
import heavenlyScotchi from '@assets/E5C67D88-4927-4439-968F-EB3578D3C68B_1794669072942.png';
import royalScotchi from '@assets/0AA10B07-C065-49CE-917E-44AAAF42798D_1794669072942.png';
import transcendentScotchi from '@assets/CF363CD3-49AC-4F2D-8EC6-32282425EA14_1794669072942.png';

/** Exact uploaded PNGs in the specified evolution order; clothing is already painted into each form. */
export const EVOLUTION_ARTWORK = [
  originalScotchi,
  sproutScotchi,
  explorerScotchi,
  magicScotchi,
  flowerScotchi,
  natureGuardianScotchi,
  starCrystalScotchi,
  heavenlyScotchi,
  royalScotchi,
  transcendentScotchi,
] as const;

export function evolutionArtworkFor(stage: number): string {
  return EVOLUTION_ARTWORK[Math.max(0, Math.min(EVOLUTION_ARTWORK.length - 1, Math.floor(stage) - 1))];
}
