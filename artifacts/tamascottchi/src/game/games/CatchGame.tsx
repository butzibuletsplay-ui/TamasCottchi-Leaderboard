import { type PointerEvent, useRef } from 'react';
import { CHARACTER, getImage, toyUrl } from '../assets';
import { type GameProps, type Particle, type Popup, burst, drawHeart, drawHud, drawParticles, drawPopups, drawSprite, stepParticles, useCanvasLoop } from '../engine';

type Kind = 'bone' | 'tennisball' | 'duck' | 'teddy' | 'frisbee' | 'mud';
type Drop = { x: number; y: number; vy: number; kind: Kind; r: number; spin: number };
const VALUE: Record<Kind, number> = { bone: 10, tennisball: 6, duck: 8, teddy: 25, frisbee: 15, mud: 0 };

export function CatchGame({ onEnd, sound, extras = [] }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasFrisbee = extras.includes('frisbee');
  const s = useRef({
    px: -1, tx: -1, drops: [] as Drop[], particles: [] as Particle[], popups: [] as Popup[],
    spawn: 0.6, t: 0, score: 0, combo: 0, maxCombo: 0, lives: 3, clean: 0, maxClean: 0, caught: 0,
    double: 0, shake: 0, over: false,
  }).current;
  const imgs = { player: getImage(CHARACTER.default), hurt: getImage(CHARACTER.sad), happy: getImage(CHARACTER.excited), ...Object.fromEntries((['bone', 'tennisball', 'duck', 'teddy', 'frisbee'] as const).map((k) => [k, getImage(toyUrl(k))])) } as Record<string, HTMLImageElement>;
  let happyFor = 0;

  useCanvasLoop(canvasRef, {
    step(dt, w, h) {
      if (s.over) return;
      if (s.px < 0) { s.px = w / 2; s.tx = w / 2; }
      s.t += dt; s.double = Math.max(0, s.double - dt); s.shake = Math.max(0, s.shake - dt); happyFor = Math.max(0, happyFor - dt);
      s.px += (s.tx - s.px) * Math.min(1, dt * 28);
      const scale = h / 420;
      s.spawn -= dt;
      if (s.spawn <= 0) {
        s.spawn = Math.max(0.32, 0.95 - s.t * 0.011) * (0.75 + Math.random() * 0.5);
        const badChance = Math.min(0.34, 0.16 + s.t * 0.003);
        const roll = Math.random();
        const kind: Kind = roll < badChance ? 'mud' : roll < badChance + 0.035 ? 'teddy' : hasFrisbee && roll < badChance + 0.07 ? 'frisbee' : (['bone', 'tennisball', 'duck'] as const)[Math.floor(Math.random() * 3)];
        const r = 22;
        s.drops.push({ x: r + Math.random() * (w - 2 * r), y: -r, vy: (150 + Math.min(330, s.t * 6) + Math.random() * 50) * scale, kind, r, spin: Math.random() * 6 });
      }
      const pw = Math.min(110, w * 0.22), top = h - pw * 0.95;
      for (let i = s.drops.length - 1; i >= 0; i--) {
        const d = s.drops[i]; d.y += d.vy * dt; d.spin += dt * 2;
        if (d.y + d.r * 0.6 >= top && d.y < h - 10 && Math.abs(d.x - s.px) < pw * 0.45 + d.r * 0.4) {
          s.drops.splice(i, 1);
          if (d.kind === 'mud') {
            s.lives -= 1; s.combo = 0; s.clean = 0; s.shake = 0.3;
            burst(s.particles, d.x, d.y, '#6b4a2e', 14); s.popups.push({ x: d.x, y: d.y, text: 'Matsch!', life: 0.9, color: '#6b4a2e' });
            sound(180, { dur: 0.25, type: 'sawtooth', slide: 90 });
            if (s.lives <= 0) { s.over = true; onEnd({ score: s.score, metrics: { caught: s.caught, maxClean: s.maxClean, maxCombo: s.maxCombo, seconds: Math.floor(s.t) } }); }
          } else {
            s.combo += 1; s.clean += 1; s.caught += 1; s.maxCombo = Math.max(s.maxCombo, s.combo); s.maxClean = Math.max(s.maxClean, s.clean);
            if (d.kind === 'teddy' && s.lives < 3) s.lives += 1;
            if (d.kind === 'frisbee') s.double = 6;
            const mult = (1 + Math.min(4, Math.floor(s.combo / 5))) * (s.double > 0 ? 2 : 1);
            const pts = VALUE[d.kind] * mult; s.score += pts; happyFor = 0.4;
            burst(s.particles, d.x, d.y, d.kind === 'teddy' ? '#d4553f' : '#f3bd75', 9);
            s.popups.push({ x: d.x, y: d.y - 10, text: `+${pts}${mult > 1 ? ` x${mult}` : ''}`, life: 0.8, color: '#2e6e66' });
            sound(520 + Math.min(10, s.combo) * 40, { dur: 0.1 });
          }
        } else if (d.y - d.r > h) {
          s.drops.splice(i, 1);
          if (d.kind !== 'mud') { s.combo = 0; s.clean = 0; }
        }
      }
      stepParticles(s.particles, dt);
    },
    draw(ctx, w, h) {
      ctx.save();
      if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 8, 0);
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe5df'); g.addColorStop(1, '#fbecc9');
      ctx.fillStyle = g; ctx.fillRect(-10, 0, w + 20, h);
      ctx.fillStyle = '#d8b486'; ctx.fillRect(-10, h - 14, w + 20, 14);
      for (const d of s.drops) {
        ctx.save(); ctx.translate(d.x, d.y);
        if (d.kind === 'mud') {
          ctx.fillStyle = '#6b4a2e'; ctx.beginPath();
          for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + d.spin, rr = d.r * (i % 2 ? 0.7 : 1); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3c2817'; ctx.lineWidth = 2; ctx.stroke();
        } else { ctx.rotate(Math.sin(d.spin) * 0.3); drawSprite(ctx, imgs[d.kind], 0, 0, d.r * (d.kind === 'teddy' ? 2.2 : 2.4)); }
        ctx.restore();
      }
      const pw = Math.min(110, w * 0.22);
      const px = s.px < 0 ? w / 2 : s.px;
      drawSprite(ctx, s.shake > 0 ? imgs.hurt : happyFor > 0 ? imgs.happy : imgs.player, px, h - pw * 0.5 - 6, pw);
      drawParticles(ctx, s.particles);
      drawPopups(ctx, s.popups, 1 / 60);
      const mult = 1 + Math.min(4, Math.floor(s.combo / 5));
      drawHud(ctx, w, `${s.score}`, s.double > 0 ? `x2 Frisbee ${s.double.toFixed(0)}s` : `Combo ${s.combo} · x${mult}`);
      for (let i = 0; i < 3; i++) drawHeart(ctx, w / 2 - 22 + i * 22, 10, 16, i < s.lives);
      const phase = s.t < 15 ? 'Warm-up' : s.t < 35 ? 'Flott' : s.t < 60 ? 'Wild' : 'Chaos';
      ctx.font = '500 11px "DM Mono", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#7a604b'; ctx.fillText(`PHASE ${phase.toUpperCase()}`, 12, 42);
      ctx.restore();
    },
  });

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    s.tx = Math.max(20, Math.min(r.width - 20, e.clientX - r.left));
  };
  return <div className="canvas-wrap">
    <canvas ref={canvasRef} className="game-canvas" data-testid="canvas-catch"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={move}/>
    <p className="game-hint">Zieh Scottchi nach links und rechts. Matsch kostet ein Leben, Teddys geben eins zurück{hasFrisbee ? ', Frisbees verdoppeln Punkte' : ''}.</p>
  </div>;
}
