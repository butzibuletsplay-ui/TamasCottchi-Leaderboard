import { useMemo, type CSSProperties } from 'react';
import { CHARACTER, MOODS, type Mood } from './assets';
import { BASE_CONFIG, SLOT_OF, layerSrc, readDevConfig, resolveFit, type OutfitConfig } from './outfits';

export { SLOT_OF } from './outfits';
export type { Slot } from './outfits';

type Props = {
  mood: Mood; equipped: string[]; action?: string; sleeping?: boolean;
  onTap?: () => void; className?: string;
  /** Explicit config (DEV editor/gallery). Ordinary gameplay always uses the checked-in config. */
  config?: OutfitConfig; idle?: string; highlight?: string; evolutionStage?: number; evolving?: boolean;
};

export function layerStyle(item: string, mood: Mood, cfg: OutfitConfig): CSSProperties | null {
  const f = resolveFit(item, mood, cfg);
  if (!f) return null;
  return {
    left: `${f.left}%`, top: `${f.top}%`, width: `${f.scaleX}%`, zIndex: f.zIndex,
    transformOrigin: `${f.pivotX * 100}% ${f.pivotY * 100}%`,
    transform: `translate(${-f.pivotX * 100}%, ${-f.pivotY * 100}%) rotate(${f.totalRotation}deg) scaleY(${f.scaleY})`,
  };
}

/**
 * Layered character. One motion wrapper (personality idle) holds one body wrapper (breathing + actions);
 * mood sprites crossfade inside it while every clothing layer interpolates its anchor transform with the
 * same duration and easing, so sprite and garment always move as a pair.
 */
const EVOLUTION_COLORS = ['#d8a75f', '#9bc6a1', '#e6aa71', '#6e9e87', '#d58c53', '#7abf8d', '#9b7acb', '#83b8db', '#e1b750', '#ffd36b'];

export function Scottchi({ mood, equipped, action = 'idle', sleeping, onTap, className = '', config, idle, highlight, evolutionStage = 1, evolving = false }: Props) {
  const cfg = useMemo(() => config ?? readDevConfig() ?? BASE_CONFIG, [config]);
  const stage = Math.max(1, Math.min(10, Math.floor(evolutionStage)));
  const worn = equipped.filter((id) => SLOT_OF[id] && cfg.items[id]);
  const hasOutfit = worn.some((id) => SLOT_OF[id] === 'outfit');
  return <div
    className={`scottchi ${className} act-${action} evolution-stage-${stage} ${stage >= 5 ? 'has-evolved-idle' : ''} ${stage >= 3 ? 'has-play-reaction' : ''} ${stage >= 8 ? 'has-stellar-evolution' : ''} ${evolving ? 'is-evolving' : ''} ${idle ? `idle-${idle}` : ''} ${sleeping ? 'is-sleeping' : ''}`}
    role={onTap ? 'button' : undefined} tabIndex={onTap ? 0 : undefined}
    aria-label={onTap ? 'Scottchi streicheln' : 'Scottchi'}
    onClick={onTap}
    onKeyDown={(e) => { if (onTap && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onTap(); } }}
    data-testid="img-wuschel" data-mood={mood} data-evolution-stage={stage}
    style={{ '--evolution-color': EVOLUTION_COLORS[stage - 1], '--evolution-opacity': 0.08 + stage * 0.026, '--evolution-scale': 1 + stage * 0.012 } as CSSProperties}
  >
    <div className="scottchi-shadow"/>
    <div className="evolution-aura" aria-hidden="true"/>
    <div className="scottchi-motion">
      <div className="scottchi-body">
        {MOODS.map((m) => <img key={m} src={CHARACTER[m]} alt="" draggable={false} className={`scottchi-sprite ${m === mood ? 'on' : ''}`} data-testid={m === mood ? `sprite-${m}` : undefined}/>)}
        {hasOutfit && MOODS.map((m) => <img key={`face-${m}`} src={CHARACTER[m]} alt="" draggable={false} style={{ clipPath: cfg.anchors[m]?.faceClip }} className={`scottchi-sprite scottchi-face ${m === mood ? 'on' : ''}`}/>)}
        {worn.map((id) => {
          const style = layerStyle(id, mood, cfg);
          if (!style) return null;
          const cls = `scottchi-layer layer-${SLOT_OF[id]} ${highlight === id ? 'is-highlight' : ''}`;
          const src = layerSrc(id);
          if (src) return <img key={id} src={src} alt="" draggable={false} className={cls} style={style} data-testid={`layer-${id}`}/>;
          if (id === 'sunglasses') return <div key={id} className={`${cls} css-glasses`} style={style} data-testid={`layer-${id}`}><span/><span/></div>;
          return <div key={id} className={`${cls} css-bow`} style={style} data-testid={`layer-${id}`}><span/><span/></div>;
        })}
      </div>
    </div>
  </div>;
}
