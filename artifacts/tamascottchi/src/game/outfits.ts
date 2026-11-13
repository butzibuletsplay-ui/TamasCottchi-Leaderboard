import checkedIn from './outfit-config.json';
import { MOODS, type Mood, hatUrl, neckUrl, assetUrl } from './assets';

export type AnchorName = 'headAnchor' | 'neckAnchor' | 'backAnchor' | 'chestAnchor' | 'frontLegAnchor' | 'rearBodyAnchor';
export const ANCHOR_NAMES: AnchorName[] = ['headAnchor', 'neckAnchor', 'backAnchor', 'chestAnchor', 'frontLegAnchor', 'rearBodyAnchor'];
export type AnchorPoint = { x: number; y: number; rotation: number };
export type MoodAnchors = Record<AnchorName, AnchorPoint> & { faceClip: string };

/** Normalized transform (percent of the character stage) relative to an anchor. */
export interface OutfitTransform {
  anchor: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  zIndex: number;
}
export type ItemFit = { anchor: AnchorName; pivotX: number; pivotY: number; base: Omit<OutfitTransform, 'anchor'>; moods: Partial<Record<Mood, Partial<Omit<OutfitTransform, 'anchor'>>>> };
export type OutfitConfig = { version: number; about?: string; anchors: Record<Mood, MoodAnchors>; items: Record<string, ItemFit> };

export type Slot = 'hat' | 'outfit' | 'neck' | 'face';
export const SLOT_OF: Record<string, Slot> = {
  hoodie: 'outfit', 'striped-shirt': 'outfit', raincoat: 'outfit', cape: 'outfit', pajamas: 'outfit', tuxedo: 'outfit',
  scarf: 'neck', collar: 'neck', bow: 'neck', sunglasses: 'face',
  baseballcap: 'hat', beanie: 'hat', 'party-hat': 'hat', crown: 'hat', 'wizard-hat': 'hat', 'sleep-cap': 'hat', 'cowboy-hat': 'hat', 'bucket-hat': 'hat',
};
export const WEARABLES = Object.keys(SLOT_OF);

/** Image used on the character. Outfits use the dog-shaped derivative (legs cropped, belly masked). */
export function layerSrc(item: string): string | null {
  const slot = SLOT_OF[item];
  if (slot === 'hat') return hatUrl(item);
  if (slot === 'outfit') return assetUrl(`clothing/outfits/${item}-fit.png`);
  if (item === 'scarf' || item === 'collar') return neckUrl(item);
  return null;
}

export const BASE_CONFIG = checkedIn as unknown as OutfitConfig;

// ---- DEV-only local overrides (editor). Never read in ordinary gameplay. ----
export const DEV_OVERRIDE_KEY = 'tamascottchi-outfit-editor-v1';
export const devToolsActive = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  return q.get('outfitEditor') === '1' || q.get('outfitGallery') === '1';
};
export function readDevConfig(): OutfitConfig | null {
  if (!devToolsActive()) return null;
  try {
    const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
    return raw ? validateConfig(JSON.parse(raw)) : null;
  } catch { return null; }
}
export function writeDevConfig(cfg: OutfitConfig | null) {
  if (!import.meta.env.DEV) return;
  if (cfg) localStorage.setItem(DEV_OVERRIDE_KEY, JSON.stringify(cfg)); else localStorage.removeItem(DEV_OVERRIDE_KEY);
}
export function validateConfig(v: unknown): OutfitConfig {
  const c = v as OutfitConfig;
  if (!c || typeof c !== 'object' || !c.anchors || !c.items) throw new Error('Kein Outfit-Konfigurationsobjekt');
  for (const m of MOODS) for (const a of ANCHOR_NAMES) {
    const p = c.anchors[m]?.[a];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error(`Anker fehlt: ${m}.${a}`);
  }
  for (const [id, f] of Object.entries(c.items)) {
    if (!ANCHOR_NAMES.includes(f.anchor) || !Number.isFinite(f.base?.scaleX)) throw new Error(`Ungültiger Eintrag: ${id}`);
  }
  return c;
}

export type ResolvedFit = OutfitTransform & { left: number; top: number; pivotX: number; pivotY: number; totalRotation: number };
export function resolveFit(item: string, mood: Mood, cfg: OutfitConfig = BASE_CONFIG): ResolvedFit | null {
  const fit = cfg.items[item];
  if (!fit) return null;
  const anchor = cfg.anchors[mood]?.[fit.anchor] ?? cfg.anchors.default[fit.anchor];
  const t = { ...fit.base, ...(fit.moods?.[mood] || {}) };
  return {
    anchor: fit.anchor, ...t,
    left: anchor.x + t.x, top: anchor.y + t.y,
    pivotX: fit.pivotX, pivotY: fit.pivotY, totalRotation: anchor.rotation + t.rotation,
  };
}
export const cloneConfig = (c: OutfitConfig): OutfitConfig => JSON.parse(JSON.stringify(c)) as OutfitConfig;
