import { useEffect, useState } from 'react';
import { CHARACTER, MOODS, type Mood, hatUrl, neckUrl, outfitUrl } from './assets';

/** Placement in percent of the character stage (center x/y, width), rotation in degrees. */
export type ClothingPlacement = { x: number; y: number; scale: number; rotation: number; zIndex: number };
export type Slot = 'hat' | 'outfit' | 'neck' | 'face';

// Base placement per item. The character faces slightly left: head upper-left, body right.
// Outfits are full illustrations with baked hoods/paws, so they sit on the torso only (behind
// the face, below the chin) and are layered under the neckwear.
const BASE: Record<string, ClothingPlacement> = {
  // outfits (layer 4)
  hoodie: { x: 57, y: 62, scale: 92, rotation: -3, zIndex: 4 },
  'striped-shirt': { x: 57, y: 62, scale: 90, rotation: -2, zIndex: 4 },
  raincoat: { x: 57, y: 62, scale: 92, rotation: -3, zIndex: 4 },
  cape: { x: 64, y: 54, scale: 82, rotation: 2, zIndex: 4 },
  pajamas: { x: 57, y: 64, scale: 92, rotation: -2, zIndex: 4 },
  tuxedo: { x: 57, y: 64, scale: 90, rotation: -2, zIndex: 4 },
  // neck (layer 5)
  scarf: { x: 35, y: 62, scale: 27, rotation: 0, zIndex: 6 },
  collar: { x: 35, y: 59, scale: 32, rotation: -4, zIndex: 6 },
  bow: { x: 35, y: 58, scale: 16, rotation: 0, zIndex: 6 },
  // face
  sunglasses: { x: 28, y: 18, scale: 26, rotation: -4, zIndex: 6 },
  // hats (layer 6)
  baseballcap: { x: 31, y: 5, scale: 38, rotation: -8, zIndex: 7 },
  beanie: { x: 30, y: 5, scale: 36, rotation: -6, zIndex: 7 },
  'party-hat': { x: 32, y: 0, scale: 26, rotation: -10, zIndex: 7 },
  crown: { x: 31, y: 3, scale: 28, rotation: -6, zIndex: 7 },
  'wizard-hat': { x: 31, y: -2, scale: 40, rotation: -8, zIndex: 7 },
  'sleep-cap': { x: 30, y: 1, scale: 34, rotation: -10, zIndex: 7 },
  'cowboy-hat': { x: 30, y: 4, scale: 46, rotation: -6, zIndex: 7 },
  'bucket-hat': { x: 30, y: 5, scale: 40, rotation: -6, zIndex: 7 },
};
// Per-mood nudges where the head/body sits differently in the sprite.
const MOOD_SHIFT: Partial<Record<Mood, { head: [number, number]; body: [number, number] }>> = {
  tired: { head: [2, 3], body: [1, 1] },
  excited: { head: [6, 3], body: [2, 0] },
  sad: { head: [1, 2], body: [0, 1] },
  hungry: { head: [0, 1], body: [0, 0] },
  dirty: { head: [-1, 1], body: [0, 0] },
};

export const SLOT_OF: Record<string, Slot> = {
  hoodie: 'outfit', 'striped-shirt': 'outfit', raincoat: 'outfit', cape: 'outfit', pajamas: 'outfit', tuxedo: 'outfit',
  scarf: 'neck', collar: 'neck', bow: 'neck', sunglasses: 'face',
  baseballcap: 'hat', beanie: 'hat', 'party-hat': 'hat', crown: 'hat', 'wizard-hat': 'hat', 'sleep-cap': 'hat', 'cowboy-hat': 'hat', 'bucket-hat': 'hat',
};

const OVERRIDE_KEY = 'tamascottchi-placement-overrides';
type Overrides = Record<string, Partial<ClothingPlacement>>; // key: `${item}` or `${item}@${mood}`
function readOverrides(): Overrides {
  if (!import.meta.env.DEV) return {};
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') as Overrides; } catch { return {}; }
}

export function placementFor(item: string, mood: Mood, overrides: Overrides = {}): ClothingPlacement | null {
  const base = BASE[item];
  if (!base) return null;
  const slot = SLOT_OF[item];
  const shift = MOOD_SHIFT[mood];
  const d = shift ? (slot === 'outfit' ? shift.body : shift.head) : [0, 0];
  return { ...base, x: base.x + d[0], y: base.y + d[1], ...overrides[item], ...overrides[`${item}@${mood}`] };
}

function srcFor(item: string): string | null {
  const slot = SLOT_OF[item];
  if (slot === 'hat') return hatUrl(item);
  if (slot === 'outfit') return outfitUrl(item);
  if (item === 'scarf' || item === 'collar') return neckUrl(item);
  return null;
}

type Props = {
  mood: Mood; equipped: string[]; action?: string; sleeping?: boolean;
  onTap?: () => void; className?: string; overrideVersion?: number;
};

/** Layered character: shadow, body (crossfaded mood sprites), outfit, neckwear, hat. All layers share one box and scale together. */
export function Scottchi({ mood, equipped, action = 'idle', sleeping, onTap, className = '', overrideVersion = 0 }: Props) {
  const [overrides, setOverrides] = useState<Overrides>(readOverrides);
  useEffect(() => { setOverrides(readOverrides()); }, [overrideVersion]);
  const worn = equipped.filter((id) => SLOT_OF[id]);
  return <div
    className={`scottchi ${className} act-${action} ${sleeping ? 'is-sleeping' : ''}`}
    role={onTap ? 'button' : undefined} tabIndex={onTap ? 0 : undefined}
    aria-label={onTap ? 'Scottchi streicheln' : 'Scottchi'}
    onClick={onTap}
    onKeyDown={(e) => { if (onTap && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onTap(); } }}
    data-testid="img-wuschel"
  >
    <div className="scottchi-shadow"/>
    <div className="scottchi-body">
      {MOODS.map((m) => <img key={m} src={CHARACTER[m]} alt="" draggable={false} className={`scottchi-sprite ${m === mood ? 'on' : ''}`} data-testid={m === mood ? `sprite-${m}` : undefined}/>)}
      {worn.some((id) => SLOT_OF[id] === 'outfit') && MOODS.map((m) => <img key={`face-${m}`} src={CHARACTER[m]} alt="" draggable={false} className={`scottchi-sprite scottchi-face ${m === mood ? 'on' : ''}`}/>)}
      {worn.map((id) => {
        const p = placementFor(id, mood, overrides);
        if (!p) return null;
        const style = { left: `${p.x}%`, top: `${p.y}%`, width: `${p.scale}%`, zIndex: p.zIndex, transform: `translate(-50%,-50%) rotate(${p.rotation}deg)` };
        const src = srcFor(id);
        if (src) return <img key={id} src={src} alt="" draggable={false} className={`scottchi-layer layer-${SLOT_OF[id]}`} style={style} data-testid={`layer-${id}`}/>;
        if (id === 'sunglasses') return <div key={id} className="scottchi-layer css-glasses" style={style}><span/><span/></div>;
        return <div key={id} className="scottchi-layer css-bow" style={style}><span/><span/></div>;
      })}
    </div>
  </div>;
}

/** DEV only: manual fine tuning of clothing placement, persisted in localStorage. */
export function PlacementTuner({ mood, equipped, onChange }: { mood: Mood; equipped: string[]; onChange: () => void }) {
  const worn = equipped.filter((id) => BASE[id]);
  const [item, setItem] = useState(worn[0] || '');
  const [perMood, setPerMood] = useState(false);
  const [all, setAll] = useState<Overrides>(readOverrides);
  if (!import.meta.env.DEV) return null;
  if (!worn.length) return <div className="tuner" data-testid="dev-tuner">DEV: Zieh Scottchi etwas an, um die Passform zu justieren.</div>;
  const current = worn.includes(item) ? item : worn[0];
  const key = perMood ? `${current}@${mood}` : current;
  const p = placementFor(current, mood, all)!;
  const update = (field: keyof ClothingPlacement, value: number) => {
    const next = { ...all, [key]: { ...all[key], [field]: value } };
    setAll(next); localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next)); onChange();
  };
  const reset = () => { const next = { ...all }; delete next[key]; setAll(next); localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next)); onChange(); };
  return <div className="tuner" data-testid="dev-tuner">
    <div className="tuner-head"><strong>DEV Passform</strong>
      <select value={current} onChange={(e) => setItem(e.target.value)} data-testid="select-tuner-item">{worn.map((id) => <option key={id}>{id}</option>)}</select>
      <label><input type="checkbox" checked={perMood} onChange={(e) => setPerMood(e.target.checked)}/> nur {mood}</label>
    </div>
    {(['x', 'y', 'scale', 'rotation'] as const).map((f) => <label key={f} className="tuner-row"><span>{f}</span>
      <input type="range" min={f === 'rotation' ? -45 : f === 'scale' ? 5 : -20} max={f === 'rotation' ? 45 : 120} step={0.5} value={p[f]} onChange={(e) => update(f, Number(e.target.value))}/>
      <code>{p[f].toFixed(1)}</code></label>)}
    <div className="tuner-head"><button className="button small" onClick={reset}>Zurücksetzen</button>
      <button className="button small" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(all, null, 2))}>JSON kopieren</button></div>
  </div>;
}
