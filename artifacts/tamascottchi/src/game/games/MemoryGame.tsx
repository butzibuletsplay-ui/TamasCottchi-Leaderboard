import { useEffect, useRef, useState } from 'react';
import { PawPrint } from 'lucide-react';
import { TOYS, hatUrl, toyUrl } from '../assets';
import type { GameProps } from '../engine';

const FACES = [...TOYS.map(toyUrl), ...['crown', 'party-hat', 'wizard-hat', 'cowboy-hat'].map(hatUrl)];
type Card = { face: string; open: boolean; matched: boolean };
export const memoryDuration = (pairs: number) => (pairs <= 6 ? 75 : pairs <= 8 ? 100 : 135);

/** Classic memory, kept from v1: flip two, match stays open. Now with sprite faces, 3D flips and tracked timers. */
export function MemoryGame({ onEnd, sound, difficulty = 6 }: GameProps) {
  const pairs = difficulty;
  const [cards, setCards] = useState<Card[]>(() => {
    const faces = [...FACES].sort(() => Math.random() - 0.5).slice(0, pairs);
    return [...faces, ...faces].sort(() => Math.random() - 0.5).map((face) => ({ face, open: false, matched: false }));
  });
  const [first, setFirst] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [time, setTime] = useState(memoryDuration(pairs));
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const timers = useRef<number[]>([]);
  const done = useRef(false);
  const stat = useRef({ score: 0, attempts: 0, time: memoryDuration(pairs), streak: 0 });
  stat.current = { ...stat.current, score, attempts, time };

  useEffect(() => {
    const id = window.setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000);
    const list = timers.current;
    return () => { window.clearInterval(id); list.forEach(clearTimeout); };
  }, []);
  useEffect(() => {
    if (done.current) return;
    const won = cards.length > 0 && cards.every((c) => c.matched);
    if (won || time <= 0) {
      done.current = true;
      const bonus = won ? time * 2 + Math.max(0, pairs * 2 - (attempts - pairs)) * 3 : 0;
      timers.current.push(window.setTimeout(() => onEnd({ score: stat.current.score + bonus, metrics: { won: won ? 1 : 0, attempts: stat.current.attempts, pairs } }), won ? 650 : 0));
    }
  }, [cards, time, attempts, pairs, onEnd]);

  const flip = (i: number) => {
    if (lock || done.current || cards[i].open || cards[i].matched) return;
    sound(500, { dur: 0.06 });
    if (first === null) { setFirst(i); setCards((old) => old.map((c, k) => k === i ? { ...c, open: true } : c)); return; }
    const a = first;
    setFirst(null); setAttempts((n) => n + 1);
    setCards((old) => old.map((c, k) => k === i ? { ...c, open: true } : c));
    if (cards[a].face === cards[i].face) {
      stat.current.streak += 1;
      const pts = 10 + Math.min(3, stat.current.streak - 1) * 5;
      setScore((sc) => sc + pts); sound(740 + stat.current.streak * 40, { dur: 0.12 });
      timers.current.push(window.setTimeout(() => setCards((old) => old.map((c, k) => k === i || k === a ? { ...c, matched: true } : c)), 280));
    } else {
      stat.current.streak = 0; setLock(true);
      timers.current.push(window.setTimeout(() => { setCards((old) => old.map((c, k) => k === i || k === a ? { ...c, open: false } : c)); setLock(false); }, 750));
    }
  };

  const cols = pairs >= 12 ? 6 : 4;
  return <div className="memory2">
    <div className="cups-head"><span className="eyebrow">{pairs} PAARE · {attempts} VERSUCHE</span><strong data-testid="text-memory-score">{score} Pkt.</strong><span className="eyebrow">{Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}</span></div>
    <div className="memory2-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {cards.map((c, i) => <button key={i} className={`mcard ${c.open || c.matched ? 'flipped' : ''} ${c.matched ? 'matched' : ''}`} onPointerDown={(e) => { e.preventDefault(); flip(i); }} data-testid={`memory-card-${i}`} aria-label={c.open || c.matched ? 'Offene Karte' : 'Verdeckte Karte'}>
        <span className="mcard-inner"><span className="mcard-back"><PawPrint size={22}/></span><span className="mcard-front"><img src={c.face} alt="" draggable={false}/></span></span>
      </button>)}
    </div>
    <p className="game-hint">Finde alle Paare. Serien geben Bonuspunkte, wenige Versuche einen Abschlussbonus.</p>
  </div>;
}
