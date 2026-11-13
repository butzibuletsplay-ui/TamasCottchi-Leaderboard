import { type RefObject, useEffect, useRef } from 'react';

export type GameId = 'catch' | 'memory' | 'turbo' | 'bone' | 'run';
export type GameResult = { score: number; metrics: Record<string, number> };
export type SoundFn = (freq?: number, opts?: { dur?: number; type?: OscillatorType; slide?: number }) => void;
export type GameProps = { onEnd: (r: GameResult) => void; sound: SoundFn; difficulty?: number; extras?: string[] };

type Loop = { step: (dt: number, w: number, h: number) => void; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void };

/**
 * Single requestAnimationFrame loop with delta time (clamped so tab switches don't teleport objects),
 * DPR-aware canvas sizing via ResizeObserver, and full cleanup on unmount.
 */
export function useCanvasLoop(canvasRef: RefObject<HTMLCanvasElement | null>, loop: Loop) {
  const loopRef = useRef(loop);
  loopRef.current = loop;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    let w = 0, h = 0, raf = 0, last = performance.now(), alive = true;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const frame = (t: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
      if (w > 0 && h > 0) { loopRef.current.step(dt, w, h); loopRef.current.draw(ctx, w, h); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [canvasRef]);
}

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
export function burst(list: Particle[], x: number, y: number, color: string, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.6 + Math.random() * 0.3, color });
  }
  if (list.length > 160) list.splice(0, list.length - 160);
}
export function stepParticles(list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
    if (p.life <= 0) list.splice(i, 1);
  }
}
export function drawParticles(ctx: CanvasRenderingContext2D, list: Particle[]) {
  for (const p of list) { ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6)); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
export type Popup = { x: number; y: number; text: string; life: number; color: string };
export function drawPopups(ctx: CanvasRenderingContext2D, list: Popup[], dt: number) {
  ctx.textAlign = 'center'; ctx.font = '700 18px Fredoka, sans-serif';
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]; p.life -= dt; p.y -= 40 * dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.strokeStyle = '#fff4da'; ctx.lineWidth = 4;
    ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}
export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, filled: boolean) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
  ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
  ctx.fillStyle = filled ? '#d4553f' : '#e4dfd1'; ctx.fill(); ctx.strokeStyle = '#50301d'; ctx.lineWidth = 1.5; ctx.stroke();
}
export function drawHud(ctx: CanvasRenderingContext2D, w: number, left: string, right: string) {
  ctx.font = '700 17px Fredoka, sans-serif'; ctx.fillStyle = '#50301d'; ctx.textAlign = 'left'; ctx.fillText(left, 12, 24);
  ctx.textAlign = 'right'; ctx.fillText(right, w - 12, 24);
}
export const drawSprite = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, width: number) => {
  if (!(img.complete && img.naturalWidth)) { ctx.fillStyle = '#d48141'; ctx.beginPath(); ctx.arc(cx, cy, width / 3, 0, Math.PI * 2); ctx.fill(); return; }
  const hgt = width * img.naturalHeight / img.naturalWidth;
  ctx.drawImage(img, cx - width / 2, cy - hgt / 2, width, hgt);
};
