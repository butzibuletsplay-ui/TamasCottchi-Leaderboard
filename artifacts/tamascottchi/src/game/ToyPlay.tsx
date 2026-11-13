import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';

export type Point = { x: number; y: number }; // percent of the room card
export type Throw = { id: string; kind: 'ball' | 'frisbee'; img: string; from: Point; to: Point; key: number };

const clampPt = (p: Point): Point => ({ x: Math.max(8, Math.min(92, p.x)), y: Math.max(48, Math.min(86, p.y)) });

/** Captures one aim tap (ball) or one swipe (frisbee) on the room. */
export function AimLayer({ kind, onThrow, onCancel }: { kind: 'ball' | 'frisbee'; onThrow: (from: Point, to: Point) => void; onCancel: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ p: Point; t: number } | null>(null);
  const [trail, setTrail] = useState<{ a: Point; b: Point } | null>(null);
  const [hint, setHint] = useState(kind === 'ball' ? 'Tippe auf den Boden, wohin der Ball fliegen soll.' : 'Wische in eine Richtung, um das Frisbee zu werfen.');
  const pct = (e: RPointerEvent): Point => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const down = (e: RPointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); start.current = { p: pct(e), t: performance.now() }; };
  const move = (e: RPointerEvent) => { if (kind === 'frisbee' && start.current) setTrail({ a: start.current.p, b: pct(e) }); };
  const up = (e: RPointerEvent) => {
    const s = start.current; start.current = null; setTrail(null);
    if (!s) return;
    const end = pct(e);
    if (kind === 'ball') { onThrow({ x: 50, y: 90 }, clampPt(end)); return; }
    const dx = end.x - s.p.x, dy = end.y - s.p.y, len = Math.hypot(dx, dy);
    if (len < 6) { setHint('Etwas länger wischen. Die Richtung zählt.'); return; }
    const speed = Math.min(2.2, Math.max(0.8, len / Math.max(60, performance.now() - s.t) * 9));
    const far = 34 * speed;
    onThrow(clampPt(s.p), clampPt({ x: s.p.x + (dx / len) * far, y: s.p.y + (dy / len) * far * 0.6 }));
  };
  return <div ref={ref} className={`aim-layer aim-${kind}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} data-testid={`aim-${kind}`}>
    <div className="aim-hint">{hint}<button className="button small ghost" onPointerDown={(e) => e.stopPropagation()} onClick={onCancel} data-testid="button-aim-cancel">Abbrechen</button></div>
    {trail && <svg className="aim-trail" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1={trail.a.x} y1={trail.a.y} x2={trail.b.x} y2={trail.b.y}/></svg>}
  </div>;
}

/** Thrown toy using transform-only Web Animations. */
export function FlyingToy({ t, duration, onLand }: { t: Throw; duration: number; onLand: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  const landRef = useRef(onLand); landRef.current = onLand;
  useEffect(() => {
    const el = ref.current; const box = el?.parentElement;
    if (!el || !box) return;
    const w = box.clientWidth, h = box.clientHeight;
    const dx = ((t.to.x - t.from.x) / 100) * w, dy = ((t.to.y - t.from.y) / 100) * h;
    const frames: Keyframe[] = t.kind === 'ball'
      ? [{ transform: 'translate(0,0) rotate(0) scale(.8)' }, { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - h * 0.32}px) rotate(300deg) scale(1)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(540deg) scale(1)`, offset: 0.8 }, { transform: `translate(${dx}px, ${dy - h * 0.05}px) rotate(600deg)`, offset: 0.9 }, { transform: `translate(${dx}px, ${dy}px) rotate(640deg)` }]
      : [{ transform: 'translate(0,0) rotate(0) scaleY(.55)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - h * 0.12}px) rotate(540deg) scaleY(.55)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px) rotate(1080deg) scaleY(.7)` }];
    const anim = el.animate(frames, { duration, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'forwards' });
    anim.onfinish = () => landRef.current();
    return () => anim.cancel();
  }, [t, duration]);
  return <img ref={ref} src={t.img} alt="" className={`flying-toy fly-${t.kind}`} style={{ left: `${t.from.x}%`, top: `${t.from.y}%` }} data-testid={`flying-${t.kind}`}/>;
}
