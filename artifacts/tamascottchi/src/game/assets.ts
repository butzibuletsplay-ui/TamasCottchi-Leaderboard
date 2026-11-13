// Central asset registry. All URLs are resolved against Vite's BASE_URL so the
// game works when served from a sub path.
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
export const assetUrl = (path: string) => `${BASE}assets/${path}`;

export type Mood = 'default' | 'happy' | 'hungry' | 'tired' | 'dirty' | 'sad' | 'excited';
export const MOODS: Mood[] = ['default', 'happy', 'hungry', 'tired', 'dirty', 'sad', 'excited'];
export const CHARACTER: Record<Mood, string> = Object.fromEntries(
  MOODS.map((m) => [m, assetUrl(`characters/scottchi-${m}.png`)]),
) as Record<Mood, string>;

export type RoomKey = 'livingroom' | 'bathroom' | 'bedroom' | 'playroom';
/** pos = object-position on wide screens, mobilePos = crop window on narrow screens. */
export const BACKGROUNDS: Record<RoomKey, { src: string; fallback: string; pos: string; mobilePos: string }> = {
  livingroom: { src: assetUrl('backgrounds/livingroom.webp'), fallback: assetUrl('backgrounds/livingroom.png'), pos: '50% 55%', mobilePos: '46% 60%' },
  bathroom: { src: assetUrl('backgrounds/bathroom.webp'), fallback: assetUrl('backgrounds/bathroom.png'), pos: '50% 55%', mobilePos: '38% 60%' },
  bedroom: { src: assetUrl('backgrounds/bedroom.webp'), fallback: assetUrl('backgrounds/bedroom.png'), pos: '50% 60%', mobilePos: '58% 65%' },
  playroom: { src: assetUrl('backgrounds/playroom.webp'), fallback: assetUrl('backgrounds/playroom.png'), pos: '50% 55%', mobilePos: '50% 60%' },
};

export const HATS = ['baseballcap', 'beanie', 'party-hat', 'crown', 'wizard-hat', 'sleep-cap', 'cowboy-hat', 'bucket-hat'] as const;
export const OUTFITS = ['hoodie', 'striped-shirt', 'raincoat', 'cape', 'pajamas', 'tuxedo'] as const;
export const NECKWEAR = ['scarf', 'collar'] as const;
export const TOYS = ['bone', 'tennisball', 'duck', 'rope', 'frisbee', 'teddy', 'bowl', 'shampoo'] as const;

export const hatUrl = (id: string) => assetUrl(`clothing/hats/${id}.png`);
export const outfitUrl = (id: string) => assetUrl(`clothing/outfits/${id}.png`);
export const neckUrl = (id: string) => assetUrl(`clothing/accessories/${id}.png`);
export const toyUrl = (id: (typeof TOYS)[number]) => assetUrl(`toys/${id}.png`);

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

/** Returns a cached Image element (may still be loading). Safe for canvas drawing checks. */
export function getImage(src: string): HTMLImageElement {
  let img = cache.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    cache.set(src, img);
  }
  return img;
}
export const imageReady = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0;

export function preloadImage(src: string): Promise<HTMLImageElement | null> {
  const existing = pending.get(src);
  if (existing) return existing;
  const img = getImage(src);
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    if (imageReady(img)) { resolve(img); return; }
    img.addEventListener('load', () => resolve(img), { once: true });
    img.addEventListener('error', () => resolve(null), { once: true });
  });
  pending.set(src, p);
  return p;
}
export const preloadAll = (srcs: string[]) => Promise.all(srcs.map(preloadImage));

export const CORE_SPRITES = [...Object.values(CHARACTER)];
export const GAME_SPRITES = [CHARACTER.default, CHARACTER.excited, CHARACTER.sad, ...TOYS.map(toyUrl), hatUrl('crown'), hatUrl('party-hat'), hatUrl('wizard-hat'), hatUrl('cowboy-hat'), BACKGROUNDS.playroom.src];
