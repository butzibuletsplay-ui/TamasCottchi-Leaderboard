import { useEffect, useRef, useState } from 'react';
import { CHARACTER, toyUrl } from '../assets';
import type { GameProps } from '../engine';
type Phase = 'show' | 'hide' | 'shuffle' | 'pick' | 'reveal';
const ROUNDS = 8;
const LEVELS = [
  { swaps: 4, ms: 560 },
  { swaps: 6, ms: 420 },
  { swaps: 8, ms: 320 },
];
const STEP = 140; // translateX step in % of cup width

/**
 * Real shell game: each cup has an identity, the bone belongs to one cup id.
 * Every swap physically moves two cups (WAAPI arc) and updates the slot map,
 * so the bone always ends up wherever its cup went.
 */
export function CupsGame({ onEnd, sound, difficulty = 1 }: GameProps) {
  const level = LEVELS[Math.max(0, Math.min(2, difficulty))];
  const [slots, setSlots] = useState([0, 1, 2]); // slots[cupId] = position
  const [boneCup, setBoneCup] = useState(() => Math.floor(Math.random() * 3));
  const [phase, setPhase] = useState<Phase>('show');
  const [round, setRound] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  const [msg, setMsg] = useState('Merk dir, wo der Knochen liegt.');
  const st = useRef({ score: 0, streak: 0, maxStreak: 0, hits: 0, misses: 0, over: false });
  const [hud, setHud] = useState({ score: 0, misses: 0 });
  const cupEls = useRef<(HTMLButtonElement | null)[]>([]);
  const slotsRef = useRef(slots); slotsRef.current = slots;
  const alive = useRef(true);
  const soundRef = useRef(sound); soundRef.current = sound;
  const timers = useRef<number[]>([]);
  const wait = (ms: number) => new Promise<void>((res) => { timers.current.push(window.setTimeout(res, ms)); });

  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout); cupEls.current.forEach((el) => el?.getAnimations().forEach((a) => a.cancel())); }; }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await wait(1300); if (cancelled || !alive.current) return;
      setPhase('hide'); await wait(450); if (cancelled || !alive.current) return;
      setPhase('shuffle'); setMsg('Augen auf den Becher!');
      const swaps = level.swaps + Math.floor((round - 1) * 0.6);
      const ms = Math.max(170, level.ms * Math.pow(0.92, round - 1));
      let cur = [...slotsRef.current];
      for (let i = 0; i < swaps; i++) {
        const a = Math.floor(Math.random() * 3); let b = Math.floor(Math.random() * 2); if (b >= a) b += 1;
        const posA = a, posB = b;
        const cupA = cur.indexOf(posA), cupB = cur.indexOf(posB);
        const elA = cupEls.current[cupA], elB = cupEls.current[cupB];
        const anims = [
          elA?.animate([{ transform: `translateX(${posA * STEP}%) translateY(0)` }, { transform: `translateX(${(posA + posB) / 2 * STEP}%) translateY(-28%) scale(1.05)` }, { transform: `translateX(${posB * STEP}%) translateY(0)` }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }),
          elB?.animate([{ transform: `translateX(${posB * STEP}%) translateY(0)` }, { transform: `translateX(${(posA + posB) / 2 * STEP}%) translateY(18%) scale(.95)` }, { transform: `translateX(${posA * STEP}%) translateY(0)` }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' }),
        ];
        soundRef.current(300 + i * 25, { dur: 0.05 });
        await Promise.all(anims.map((an) => an?.finished.catch(() => undefined)));
        if (cancelled || !alive.current) return;
        cur = cur.map((p, id) => id === cupA ? posB : id === cupB ? posA : p);
        slotsRef.current = cur;
        setSlots(cur);
        // commit the final position in style so cancelling the animation does not jump
        if (elA) elA.style.transform = `translateX(${posB * STEP}%)`;
        if (elB) elB.style.transform = `translateX(${posA * STEP}%)`;
        anims.forEach((an) => an?.cancel());
      }
      setPhase('pick'); setMsg('Wo ist der Knochen?');
    })();
    return () => { cancelled = true; };
  // A round owns the entire asynchronous sequence. Depending on phase would
  // cancel this sequence as soon as it changes from show to hide.
  }, [round, level.ms, level.swaps]);

  const choose = (cup: number) => {
    if (phase !== 'pick' || st.current.over) return;
    setPicked(cup); setPhase('reveal');
    const s = st.current;
    if (cup === boneCup) {
      s.streak += 1; s.hits += 1; s.maxStreak = Math.max(s.maxStreak, s.streak);
      const pts = (10 + round * 3 + difficulty * 5) * Math.min(3, s.streak);
      s.score += pts; setMsg(`Richtig! +${pts}${s.streak > 1 ? ` (Serie ${s.streak})` : ''}`); sound(820, { dur: 0.15, slide: 1100 });
    } else { s.streak = 0; s.misses += 1; setMsg('Daneben. Hier lag er.'); sound(200, { dur: 0.25, type: 'sawtooth' }); }
    setHud({ score: s.score, misses: s.misses });
    timers.current.push(window.setTimeout(() => {
      if (!alive.current) return;
      if (round >= ROUNDS || s.misses >= 3) { s.over = true; onEnd({ score: s.score, metrics: { maxStreak: s.maxStreak, hits: s.hits, rounds: round } }); return; }
      setPicked(null); setBoneCup(Math.floor(Math.random() * 3)); setRound((r) => r + 1); setPhase('show'); setMsg('Neue Runde. Merk dir den Knochen.');
    }, 1400));
  };

  const lifted = (cup: number) => phase === 'show' || (phase === 'reveal' && (cup === picked || cup === boneCup));
  return <div className="cups">
    <div className="cups-head"><span className="eyebrow">RUNDE {round}/{ROUNDS}</span><strong data-testid="text-cups-score">{hud.score} Pkt.</strong><span className="eyebrow">FEHLER {hud.misses}/3</span></div>
    <div className={`cups-stage phase-${phase}`} data-testid="game-playfield">
      <img src={phase === 'reveal' && picked === boneCup ? CHARACTER.excited : phase === 'reveal' ? CHARACTER.sad : CHARACTER.default} alt="" className="cups-judge"/>
      {[0, 1, 2].map((cup) => <button key={cup} ref={(el) => { cupEls.current[cup] = el; }} className={`cup2 ${lifted(cup) ? 'lifted' : ''} ${phase === 'reveal' && cup === picked ? (cup === boneCup ? 'right' : 'wrong') : ''}`}
        style={{ transform: `translateX(${slots[cup] * STEP}%)` }} onClick={() => choose(cup)} disabled={phase !== 'pick'} data-testid={`cup-${slots[cup]}`} aria-label={`Becher an Position ${slots[cup] + 1}`}>
        {cup === boneCup && <img src={toyUrl('bone')} alt="" className="cup-bone"/>}
        <span className="cup-shell"/>
      </button>)}
    </div>
    <p className="game-hint" data-testid="text-cups-msg">{msg}</p>
  </div>;
}
