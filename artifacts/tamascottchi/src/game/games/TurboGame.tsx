import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { CHARACTER, toyUrl } from '../assets';
import type { GameProps } from '../engine';

type Obj = 'bone' | 'tennisball' | 'duck' | 'shampoo' | 'rope' | 'clock';
type Target = { id: number; x: number; y: number; obj: Obj; good: boolean; hit?: boolean };
type Task = { kind: 'tap' | 'pick' | 'avoid' | 'hop'; text: string; targets: Target[]; start: number; window: number; remaining: number };
const NAMES: Record<Exclude<Obj, 'clock'>, string> = { bone: 'den Knochen', tennisball: 'den Ball', duck: 'die Ente', shampoo: 'das Shampoo', rope: 'das Seil' };
const POOL: Exclude<Obj, 'clock'>[] = ['bone', 'tennisball', 'duck', 'shampoo', 'rope'];
const DURATION = 30;

let uid = 0;
function spots(n: number) {
  const out: { x: number; y: number }[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const p = { x: 12 + Math.random() * 76, y: 14 + Math.random() * 70 };
    if (out.every((o) => Math.hypot(o.x - p.x, (o.y - p.y) * 0.7) > 22)) out.push(p);
  }
  while (out.length < n) out.push({ x: 15 + out.length * 20, y: 50 });
  return out;
}
function makeTask(elapsed: number, now: number): Task {
  const d = Math.min(1, elapsed / DURATION);
  const window = 2.1 - d * 1.05;
  const roll = Math.random();
  const kind: Task['kind'] = elapsed < 4 ? 'tap' : roll < 0.25 ? 'tap' : roll < 0.55 ? 'pick' : roll < 0.8 ? 'avoid' : 'hop';
  let targets: Target[] = [];
  let text = '';
  if (kind === 'tap' || kind === 'hop') {
    const [p] = spots(1);
    targets = [{ id: ++uid, ...p, obj: 'bone', good: true }];
    text = kind === 'tap' ? 'Schnell: Knochen!' : 'Der Ball hüpft. Fang ihn!';
    if (kind === 'hop') targets[0].obj = 'tennisball';
  } else if (kind === 'pick') {
    const want = POOL[Math.floor(Math.random() * POOL.length)];
    const n = 3 + Math.round(d * 2);
    const others = POOL.filter((o) => o !== want);
    targets = spots(n).map((p, i) => ({ id: ++uid, ...p, obj: i === 0 ? want : others[Math.floor(Math.random() * others.length)], good: i === 0 }));
    text = `Tippe auf ${NAMES[want]}`;
  } else {
    const n = 4 + Math.round(d * 2);
    const bad = 1 + Math.round(Math.random() * (1 + d));
    targets = spots(n).map((p, i) => ({ id: ++uid, ...p, obj: i < bad ? 'shampoo' : POOL.filter((o) => o !== 'shampoo')[Math.floor(Math.random() * 4)], good: i >= bad }));
    text = 'Alles außer Shampoo!';
  }
  if (Math.random() < 0.13 && elapsed > 3) { const [p] = spots(targets.length + 1).slice(-1); targets.push({ id: ++uid, ...p, obj: 'clock', good: false }); }
  const remaining = targets.filter((t) => t.good).length;
  return { kind, text, targets, start: now, window: kind === 'avoid' ? window + remaining * 0.45 : window, remaining };
}

export function TurboGame({ onEnd, sound }: GameProps) {
  const t0 = useRef(performance.now());
  const extra = useRef(0);
  const s = useRef({ score: 0, combo: 0, maxCombo: 0, hits: 0, fast: 0, over: false });
  const [task, setTask] = useState<Task>(() => makeTask(0, performance.now()));
  const taskRef = useRef(task); taskRef.current = task;
  const [hud, setHud] = useState({ score: 0, combo: 0 });
  const [flash, setFlash] = useState<{ id: number; x: number; y: number; text: string; good: boolean } | null>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const elapsed = () => (performance.now() - t0.current) / 1000 - extra.current;
  const show = (x: number, y: number, text: string, good: boolean) => {
    setFlash({ id: ++uid, x, y, text, good });
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 550);
  };
  const next = () => setTask(makeTask(elapsed(), performance.now()));
  const fail = (penalty: number) => { s.current.combo = 0; extra.current -= penalty; setHud({ score: s.current.score, combo: 0 }); };

  useEffect(() => {
    let raf = 0, lastHop = performance.now();
    const loop = (now: number) => {
      if (s.current.over) return;
      const left = DURATION - elapsed();
      if (timeEl.current) timeEl.current.textContent = Math.max(0, left).toFixed(1);
      const tk = taskRef.current;
      const frac = Math.max(0, 1 - (now - tk.start) / 1000 / tk.window);
      if (barEl.current) barEl.current.style.transform = `scaleX(${frac})`;
      if (left <= 0) {
        s.current.over = true;
        onEnd({ score: s.current.score, metrics: { maxCombo: s.current.maxCombo, hits: s.current.hits, fast: s.current.fast } });
        return;
      }
      if (frac <= 0) { fail(0); sound(220, { dur: 0.12 }); next(); }
      else if (tk.kind === 'hop' && now - lastHop > Math.max(320, 620 - elapsed() * 9)) {
        lastHop = now; const [p] = spots(1);
        setTask((old) => old === tk ? { ...old, targets: old.targets.map((t) => t.good ? { ...t, ...p } : t) } : old);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(flashTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (t: Target) => {
    if (s.current.over || t.hit) return;
    const tk = taskRef.current;
    if (t.obj === 'clock') {
      extra.current += 2; show(t.x, t.y, '+2s', true); sound(990, { dur: 0.1 });
      setTask({ ...tk, targets: tk.targets.map((o) => o.id === t.id ? { ...o, hit: true } : o) }); return;
    }
    if (!t.good) { fail(1.5); show(t.x, t.y, '-1.5s', false); sound(180, { dur: 0.2, type: 'sawtooth' }); next(); return; }
    const remaining = tk.remaining - 1;
    if (remaining > 0) {
      s.current.score += 3; sound(600, { dur: 0.06 });
      setTask({ ...tk, remaining, targets: tk.targets.map((o) => o.id === t.id ? { ...o, hit: true } : o) });
      show(t.x, t.y, '+3', true); return;
    }
    const reaction = (performance.now() - tk.start) / 1000;
    const quick = reaction < tk.window * 0.5;
    s.current.combo += 1; s.current.hits += 1; if (quick) s.current.fast += 1;
    s.current.maxCombo = Math.max(s.current.maxCombo, s.current.combo);
    const mult = 1 + Math.min(4, Math.floor(s.current.combo / 4));
    const pts = (10 + (quick ? 6 : 0)) * mult;
    s.current.score += pts;
    setHud({ score: s.current.score, combo: s.current.combo });
    show(t.x, t.y, quick ? `Blitz! +${pts}` : `+${pts}`, true);
    sound(640 + Math.min(12, s.current.combo) * 35, { dur: 0.08 });
    next();
  };

  return <div className="turbo">
    <div className="turbo-head">
      <img src={CHARACTER.excited} alt="" className="turbo-coach"/>
      <div className="turbo-bubble" data-testid="text-turbo-task">{task.text}{task.kind === 'avoid' && task.remaining > 0 ? ` (${task.remaining})` : ''}</div>
      <div className="turbo-stats"><span><Timer size={14}/> <span ref={timeEl}>30.0</span></span><strong data-testid="text-turbo-score">{hud.score}</strong><small>Combo {hud.combo} · x{1 + Math.min(4, Math.floor(hud.combo / 4))}</small></div>
    </div>
    <div className="turbo-bar"><div ref={barEl}/></div>
    <div className="turbo-field" data-testid="game-playfield">
      {task.targets.map((t) => !t.hit && <button key={t.id} className={`turbo-target ${t.obj === 'clock' ? 'clock' : ''}`} style={{ left: `${t.x}%`, top: `${t.y}%` }}
        onPointerDown={(e) => { e.preventDefault(); tap(t); }} data-testid={`turbo-target-${t.obj}`} aria-label={t.obj}>
        {t.obj === 'clock' ? <Timer size={30}/> : <img src={toyUrl(t.obj)} alt="" draggable={false}/>}
      </button>)}
      {flash && <span key={flash.id} className={`turbo-flash ${flash.good ? 'good' : 'bad'}`} style={{ left: `${flash.x}%`, top: `${flash.y}%` }}>{flash.text}</span>}
    </div>
    <p className="game-hint">Lies die Aufgabe, dann tippe. Falsche Treffer kosten Zeit, Uhren schenken 2 Sekunden, schnelle Reaktionen geben Bonus.</p>
  </div>;
}
