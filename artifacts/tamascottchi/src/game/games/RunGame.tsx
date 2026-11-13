import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { BACKGROUNDS, CHARACTER, getImage, toyUrl } from '../assets';
import { type GameProps, type Particle, type Popup, burst, drawHeart, drawHud, drawParticles, drawPopups, drawSprite, stepParticles, useCanvasLoop } from '../engine';

type ObKind = 'crate' | 'puddle' | 'trash' | 'toy' | 'frisbee';
type Ob = { kind: ObKind; x: number; w: number; h: number; lift: number; hit: boolean };
type Pick = { kind: 'coin' | 'bone' | 'star'; x: number; y: number; taken: boolean };

export function RunGame({ onEnd, sound }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const s = useRef({
    y: 0, vy: 0, duck: 0, t: 0, dist: 0, bonus: 0, lives: 3, inv: 0, star: 0, next: 1.2, coins: 0, bgX: 0,
    obs: [] as Ob[], picks: [] as Pick[], particles: [] as Particle[], popups: [] as Popup[], over: false, startY: 0, swiped: false,
  }).current;
  const img = { run: getImage(CHARACTER.excited), hurt: getImage(CHARACTER.sad), duck: getImage(CHARACTER.tired), bone: getImage(toyUrl('bone')), duckToy: getImage(toyUrl('duck')), frisbee: getImage(toyUrl('frisbee')), bg: getImage(BACKGROUNDS.playroom.src) };

  const jump = () => {
    if (s.over) return;
    if (s.y >= 0) { s.vy = -760; s.duck = 0; sound(660, { dur: 0.12, slide: 880 }); }
  };
  const duck = () => { if (s.over) return; s.duck = 0.7; if (s.y < 0) s.vy = Math.max(s.vy, 700); };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowDown') { e.preventDefault(); duck(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [sound]);

  useCanvasLoop(canvasRef, {
    step(dt, w, h) {
      if (s.over) return;
      const ground = h - 34;
      s.t += dt; s.inv = Math.max(0, s.inv - dt); s.star = Math.max(0, s.star - dt); s.duck = Math.max(0, s.duck - dt);
      const speed = Math.min(640, 250 + s.t * 6.5);
      s.dist += speed * dt; s.bgX = (s.bgX + speed * 0.15 * dt);
      s.vy += 2300 * dt; s.y = Math.min(0, s.y + s.vy * dt); if (s.y >= 0) s.vy = 0;
      s.next -= dt;
      if (s.next <= 0) {
        const roll = Math.random();
        const kinds: ObKind[] = s.t > 12 ? ['crate', 'puddle', 'trash', 'toy', 'frisbee'] : ['crate', 'puddle', 'toy'];
        const kind = kinds[Math.floor(roll * kinds.length)];
        const dims: Record<ObKind, [number, number, number]> = { crate: [36, 36, 0], puddle: [58, 8, 0], trash: [32, 52, 0], toy: [36, 32, 0], frisbee: [44, 18, 44] };
        const [ow, oh, lift] = dims[kind];
        s.obs.push({ kind, x: w + 40, w: ow, h: oh, lift, hit: false });
        const pk = Math.random();
        if (pk < 0.7) {
          const kindP = pk < 0.08 ? 'star' : pk < 0.3 ? 'bone' : 'coin';
          for (let i = 0; i < (kindP === 'coin' ? 3 : 1); i++) s.picks.push({ kind: kindP, x: w + 40 + ow / 2 + (i - 1) * 30, y: ground - (kind === 'frisbee' ? 20 : 105 + (i === 1 ? 12 : 0)), taken: false });
        }
        s.next = Math.max(0.65, 1.5 - s.t * 0.012) * (0.75 + Math.random() * 0.6);
      }
      const ph = s.duck > 0 && s.y >= 0 ? 34 : 56, pw = 50, px = 70;
      const pTop = ground + s.y - ph, pBot = ground + s.y;
      for (let i = s.obs.length - 1; i >= 0; i--) {
        const o = s.obs[i]; o.x -= speed * dt;
        if (o.x + o.w < -20) { s.obs.splice(i, 1); continue; }
        const oTop = ground - o.lift - o.h, oBot = ground - o.lift;
        if (!o.hit && px + pw / 2 - 8 > o.x && px - pw / 2 + 8 < o.x + o.w && pBot - 4 > oTop && pTop + 4 < oBot) {
          o.hit = true;
          if (s.star > 0) { s.bonus += 5; burst(s.particles, o.x, oTop, '#f3bd75', 10); continue; }
          if (s.inv > 0) continue;
          s.lives -= 1; s.inv = 1.3; burst(s.particles, px, pTop + 20, '#8c6a4a', 14);
          sound(170, { dur: 0.3, type: 'sawtooth', slide: 80 });
          if (s.lives <= 0) { s.over = true; onEnd({ score: Math.floor(s.dist / 20) + s.bonus, metrics: { seconds: Math.floor(s.t), coins: s.coins } }); return; }
        }
      }
      for (let i = s.picks.length - 1; i >= 0; i--) {
        const p = s.picks[i]; p.x -= speed * dt;
        if (p.x < -20) { s.picks.splice(i, 1); continue; }
        if (!p.taken && Math.abs(p.x - px) < 30 && p.y > pTop - 14 && p.y < pBot + 10) {
          p.taken = true; s.picks.splice(i, 1);
          const pts = p.kind === 'coin' ? 5 : p.kind === 'bone' ? 10 : 15;
          if (p.kind === 'coin') s.coins += 1; if (p.kind === 'star') s.star = 3.5;
          s.bonus += pts; s.popups.push({ x: p.x, y: p.y, text: `+${pts}`, life: 0.7, color: '#2e6e66' });
          burst(s.particles, p.x, p.y, p.kind === 'star' ? '#f0c419' : '#f3bd75', 7); sound(880 + (p.kind === 'star' ? 300 : 0), { dur: 0.08 });
        }
      }
      stepParticles(s.particles, dt);
    },
    draw(ctx, w, h) {
      const ground = h - 34;
      if (img.bg.complete && img.bg.naturalWidth) {
        const bh = h, bw = bh * img.bg.naturalWidth / img.bg.naturalHeight, off = s.bgX % bw;
        ctx.globalAlpha = 0.55; ctx.drawImage(img.bg, -off, 0, bw, bh); ctx.drawImage(img.bg, -off + bw, 0, bw, bh); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,237,207,.35)'; ctx.fillRect(0, 0, w, h);
      } else { ctx.fillStyle = '#f2d99e'; ctx.fillRect(0, 0, w, h); }
      ctx.fillStyle = '#c9965f'; ctx.fillRect(0, ground, w, h - ground);
      ctx.fillStyle = '#b07e4c'; const stripe = 48, off = (s.dist % stripe);
      for (let x = -off; x < w; x += stripe) ctx.fillRect(x, ground + 8, 22, 4);
      ctx.strokeStyle = '#50301d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(w, ground); ctx.stroke();
      for (const o of s.obs) {
        const top = ground - o.lift - o.h;
        if (o.kind === 'crate') { ctx.fillStyle = '#b97a3e'; ctx.fillRect(o.x, top, o.w, o.h); ctx.strokeStyle = '#50301d'; ctx.lineWidth = 2; ctx.strokeRect(o.x, top, o.w, o.h); ctx.beginPath(); ctx.moveTo(o.x, top); ctx.lineTo(o.x + o.w, top + o.h); ctx.moveTo(o.x + o.w, top); ctx.lineTo(o.x, top + o.h); ctx.stroke(); }
        else if (o.kind === 'puddle') { ctx.fillStyle = '#7fb1c4'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, ground - 3, o.w / 2, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#50301d'; ctx.lineWidth = 1.5; ctx.stroke(); }
        else if (o.kind === 'trash') { ctx.fillStyle = '#7d8a7a'; ctx.fillRect(o.x + 2, top + 8, o.w - 4, o.h - 8); ctx.fillStyle = '#5f6b5c'; ctx.fillRect(o.x - 2, top, o.w + 4, 9); ctx.strokeStyle = '#50301d'; ctx.lineWidth = 2; ctx.strokeRect(o.x + 2, top + 8, o.w - 4, o.h - 8); ctx.strokeRect(o.x - 2, top, o.w + 4, 9); }
        else if (o.kind === 'toy') drawSprite(ctx, img.duckToy, o.x + o.w / 2, top + o.h / 2, o.w + 6);
        else drawSprite(ctx, img.frisbee, o.x + o.w / 2, top + o.h / 2, o.w + 6);
      }
      for (const p of s.picks) {
        if (p.kind === 'bone') drawSprite(ctx, img.bone, p.x, p.y, 30);
        else if (p.kind === 'coin') { ctx.fillStyle = '#f0c419'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2; ctx.stroke(); }
        else { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 14; ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a5a1c'; ctx.stroke(); }
      }
      const ducking = s.duck > 0 && s.y >= 0;
      const blink = s.inv > 0 && Math.floor(s.inv * 12) % 2 === 0;
      if (!blink) {
        ctx.save(); ctx.translate(70, ground + s.y);
        if (s.star > 0) { ctx.fillStyle = 'rgba(255,211,77,.35)'; ctx.beginPath(); ctx.arc(0, -30, 40, 0, Math.PI * 2); ctx.fill(); }
        if (ducking) { ctx.scale(1.1, 0.62); drawSprite(ctx, img.duck, 0, -32, 64); }
        else { ctx.rotate(s.y < 0 ? -0.15 : Math.sin(s.t * 18) * 0.04); drawSprite(ctx, s.inv > 0 ? img.hurt : img.run, 0, -32 + Math.abs(Math.sin(s.t * 14)) * (s.y < 0 ? 0 : -3), 64); }
        ctx.restore();
      }
      drawParticles(ctx, s.particles);
      drawPopups(ctx, s.popups, 1 / 60);
      drawHud(ctx, w, `${Math.floor(s.dist / 20) + s.bonus}`, `${Math.floor(s.t)} s`);
      for (let i = 0; i < 3; i++) drawHeart(ctx, w / 2 - 22 + i * 22, 10, 16, i < s.lives);
    },
  });

  return <div className="canvas-wrap">
    <canvas ref={canvasRef} className="game-canvas run" data-testid="canvas-run"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); s.startY = e.clientY; s.swiped = false; jump(); }}
      onPointerMove={(e) => { if (e.buttons && !s.swiped && e.clientY - s.startY > 28) { s.swiped = true; duck(); } }}/>
    <div className="run-controls">
      <button className="button orange" onPointerDown={(e) => { e.preventDefault(); jump(); }} data-testid="button-jump"><ArrowUp size={16}/> Springen</button>
      <button className="button" onPointerDown={(e) => { e.preventDefault(); duck(); }} data-testid="button-duck"><ArrowDown size={16}/> Ducken</button>
    </div>
    <p className="game-hint">Tippen zum Springen, nach unten wischen zum Ducken. Unter fliegenden Frisbees musst du dich ducken.</p>
  </div>;
}
