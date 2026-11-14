import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Clock3, Compass, Fish, LockKeyhole, MapPin, Minus, Pickaxe, Plus, Search, Sparkles, Trees } from 'lucide-react';
import { LOCATIONS, WORLD_QUESTS, itemById, type FullPetData } from './data';
import { COLLECTION_ITEMS } from './world';
import { assetUrl, CHARACTER } from './assets';
import { completeQuestAction, pickQuestPoint, startQuest } from './questEngine';
import { MaterialArt } from './MaterialArt';
import { catchFish, claimNpcRequest, claimWorldEvent, collectResource, DAILY_WORLD_GOALS, ensureWorldDay, getWorldEvent, masteryLevel, masteryProgress, placeQuestCounts, RESOURCE_NODES, visitWorldLocation, WEEKLY_WORLD_GOALS, WORLD_NPCS } from './worldEngine';
import { formatRemaining, hoursRemaining } from './worldClock';

const MAP = assetUrl('world/scottchi-world-map.webp');
const pickupPoints = [
  { x: 16, y: 24 }, { x: 28, y: 38 }, { x: 39, y: 25 }, { x: 56, y: 43 }, { x: 67, y: 28 },
  { x: 82, y: 44 }, { x: 76, y: 65 }, { x: 58, y: 67 }, { x: 39, y: 76 }, { x: 22, y: 60 },
];

type Props = { data: FullPetData; level: number; serverClockOffsetMs?: number | null; onChange: (data: FullPetData) => void; onNotice: (message: string) => void; onStore: (tab: 'food' | 'accessory') => void };
export function World({ data, level, serverClockOffsetMs, onChange, onNotice, onStore }: Props) {
  const [location, setLocation] = useState('park');
  const [quest, setQuest] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(() => Date.now() + (serverClockOffsetMs || 0));
  const authoritativeClock = serverClockOffsetMs !== null && serverClockOffsetMs !== undefined;
  const [fishing, setFishing] = useState<'idle' | 'waiting' | 'bite' | 'missed'>('idle');
  const [fishId, setFishId] = useState<'fish-common' | 'fish-rare'>('fish-common');
  const [dig, setDig] = useState<{ nodeId: string; sequence: number[]; progress: number[]; showing: boolean } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const suppressMapClick = useRef(false);
  const w = data.world;
  const foundItems = useMemo(() => new Set(w.discoveries), [w.discoveries]);
  const place = LOCATIONS.find((entry) => entry.id === location)!;
  const placeQuests = WORLD_QUESTS.filter((entry) => entry.place === location);
  const currentQuest = WORLD_QUESTS.find((entry) => entry.id === quest);
  const progress = currentQuest ? w.questProgress[currentQuest.id] || 0 : 0;
  const foundPoints = currentQuest ? w.questFinds?.[currentQuest.id] || [] : [];
  const awaitingAction = !!currentQuest && w.questStages?.[currentQuest.id] === 'awaiting-action';
  const completed = !!currentQuest && w.completedQuests.includes(currentQuest.id);
  const totalProgress = LOCATIONS.length + WORLD_QUESTS.length + COLLECTION_ITEMS.length;
  const permanentProgress = new Set([...w.discoveredLocations, ...w.completedQuests, ...w.discoveries]).size;
  const percent = Math.min(100, Math.floor(permanentProgress / totalProgress * 100));
  const worldEvent = getWorldEvent(data, level);
  const eventClaimed = !!worldEvent && w.worldEventClaimedDay === worldEvent.day;
  const npc = WORLD_NPCS.find((entry) => entry.locationId === location);
  const npcClaimed = !!npc && w.dailyClaimed.includes(npc.id);
  const locationMastery = w.areaMastery[location] || 0;
  const questCount = placeQuestCounts(location, w.completedQuests);
  const locationDiscoveries = new Set(placeQuests.flatMap((entry) => entry.discoveries).filter((id) => foundItems.has(id))).size;
  const locationNodes = RESOURCE_NODES.filter((node) => node.locationId === location);

  useEffect(() => {
    setNow(Date.now() + (serverClockOffsetMs || 0));
    const timer = window.setInterval(() => setNow(Date.now() + (serverClockOffsetMs || 0)), 30000);
    return () => window.clearInterval(timer);
  }, [serverClockOffsetMs]);

  useEffect(() => {
    const updated = ensureWorldDay(data, now, level, authoritativeClock);
    if (updated !== data) onChange(updated);
  }, [data, level, now, authoritativeClock, onChange]);

  useEffect(() => {
    if (fishing !== 'waiting' && fishing !== 'bite') return;
    const delay = fishing === 'waiting' ? 1200 + Math.random() * 1500 : 1800;
    const timer = window.setTimeout(() => setFishing((state) => state === 'waiting' ? 'bite' : state === 'bite' ? 'missed' : state), delay);
    return () => window.clearTimeout(timer);
  }, [fishing]);

  useEffect(() => {
    if (!dig?.showing) return;
    const timer = window.setTimeout(() => setDig((current) => current ? { ...current, showing: false } : current), 1500);
    return () => window.clearTimeout(timer);
  }, [dig?.showing]);

  function enter(id: string) {
    const result = visitWorldLocation(data, id, now, level, authoritativeClock);
    if (result.outcome === 'invalid') return;
    if (result.outcome === 'locked') { const target = LOCATIONS.find((entry) => entry.id === id); onNotice(`Ab Level ${target?.level || 1} freigeschaltet.`); return; }
    setLocation(id); setQuest(null); setFishing('idle'); setDig(null);
    onChange(result.data);
  }

  function gather(nodeId: string) {
    const result = collectResource(data, nodeId, now, level, authoritativeClock);
    if (result.outcome === 'locked') {
      const node = RESOURCE_NODES.find((entry) => entry.id === nodeId);
      if (node?.minMastery) onNotice(`Gebietsmeisterschaft Stufe ${node.minMastery} erforderlich.`);
      else onNotice('Dieser Ort ist noch nicht freigeschaltet.');
      return;
    }
    if (result.outcome !== 'collected') { if (result.outcome === 'cooldown') onNotice('Diese Fundstelle braucht noch etwas Ruhe.'); return; }
    setNow(Date.now() + (serverClockOffsetMs || 0));
    setDig(null);
    const node = RESOURCE_NODES.find((entry) => entry.id === nodeId)!;
    onChange(result.data);
    onNotice(`+${result.quantity} ${itemById(node.resourceId)?.name || 'Fundstück'} · erneuert sich in ${node.respawnHours} Stunden.`);
  }

  function startFishing() {
    setFishId(Math.random() < .14 ? 'fish-rare' : 'fish-common');
    setFishing('waiting');
  }

  function reelFish() {
    if (fishing !== 'bite') return;
    const result = catchFish(data, fishId, now, level, authoritativeClock);
    setFishing('idle');
    setNow(Date.now() + (serverClockOffsetMs || 0));
    onChange(result.data);
    onNotice(result.outcome === 'practice'
      ? 'Der Fisch ist entkommen – deine drei Tagesfänge sind schon sicher. Du kannst weiter üben.'
      : `Guter Fang: ${itemById(fishId)?.name}. ${result.data.world.fishingRewardsToday}/3 belohnte Fänge heute.`);
  }

  function startExcavation(nodeId: string) {
    const node = RESOURCE_NODES.find((entry) => entry.id === nodeId);
    if (!node || hoursRemaining(w.resourceCollectedAt[nodeId], node.respawnHours, now) > 0) {
      onNotice('Diese Ausgrabungsstelle ist noch nicht bereit.');
      return;
    }
    setDig({ nodeId, sequence: Array.from({ length: 3 }, () => Math.floor(Math.random() * 4)), progress: [], showing: true });
  }

  function tapDig(index: number) {
    if (!dig || dig.showing) return;
    const nextProgress = [...dig.progress, index];
    if (dig.sequence[nextProgress.length - 1] !== index) {
      setDig({ ...dig, progress: [] });
      onNotice('Die Spur war falsch. Schau dir die Fundzeichen an und versuche es erneut.');
      return;
    }
    if (nextProgress.length === dig.sequence.length) {
      gather(dig.nodeId);
      setDig(null);
      return;
    }
    setDig({ ...dig, progress: nextProgress });
  }

  function claimEvent() {
    if (!worldEvent) return;
    const result = claimWorldEvent(data, now, level, authoritativeClock);
    if (result.outcome === 'claimed') {
      onChange(result.data);
      onNotice(`Ereignis gefunden: +${worldEvent.quantity} ${itemById(worldEvent.resourceId)?.name}.`);
    } else onNotice('Das heutige Ereignis wurde bereits eingesammelt.');
  }

  function claimNpc() {
    if (!npc) return;
    const result = claimNpcRequest(data, location, now, level, authoritativeClock);
    if (result.outcome === 'claimed') {
      onChange(result.data);
      onNotice(`${npc.name}s Auftrag erledigt: +${npc.rewardCoins} Münzen und +${npc.rewardXp} XP.`);
    } else if (result.outcome === 'missing') {
      onNotice(`Dafür fehlt noch: ${itemById(npc.itemId)?.name || 'Material'}.`);
    } else if (result.outcome === 'already-claimed') {
      onNotice('Dieser Auftrag ist für heute bereits erledigt.');
    }
  }

  function openQuest(id: string) {
    const definition = WORLD_QUESTS.find((entry) => entry.id === id);
    if (!definition) return;
    setQuest(id);
    if (!w.completedQuests.includes(id)) onChange(startQuest(data, id));
  }

  function pick(point: number) {
    if (!currentQuest || completed || awaitingAction) return;
    const result = pickQuestPoint(data, currentQuest.id, point);
    onChange(result.data);
    if (result.outcome === 'wrong-order') onNotice('Die Reihenfolge stimmt nicht. Der Lichtpfad beginnt wieder von vorn.');
    else if (result.outcome === 'already-found') onNotice('Diesen Fund hast du schon eingesammelt.');
    else if (result.outcome === 'completed') onNotice(`Aufgabe geschafft! +${currentQuest.coins} Münzen und +${currentQuest.xp} XP.`);
    else if (result.outcome === 'awaiting-action') onNotice(currentQuest.requiresAction === 'use:ball' ? 'Der Ball ist gefunden. Wirf ihn jetzt im Spielzimmer.' : currentQuest.requiresAction === 'use:frisbee' ? 'Das Frisbee ist gefunden. Wirf es jetzt im Spielzimmer.' : 'Die Truhe ist freigelegt. Öffne sie für ihren Schatz.');
    else if (result.outcome === 'found') onNotice(`+1 ${itemById(currentQuest.loot)?.name || 'Fundstück'} · ${Math.min(progress + 1, currentQuest.target)}/${currentQuest.target}`);
  }

  function completeAction() {
    if (!currentQuest) return;
    const result = completeQuestAction(data, currentQuest.requiresAction || '');
    if (result.outcome === 'completed') {
      onChange(result.data);
      onNotice(`Aufgabe geschafft! +${currentQuest.coins} Münzen und +${currentQuest.xp} XP.`);
    } else onNotice('Die Hinweise fehlen noch.');
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressMapClick.current = false;
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, moved: false };
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 5) drag.current.moved = true;
    setOffset({ x: Math.min(200, Math.max(-200, drag.current.ox + (event.clientX - drag.current.x))), y: Math.min(100, Math.max(-100, drag.current.oy + (event.clientY - drag.current.y))) });
  }
  function pointerUp() { suppressMapClick.current = !!drag.current?.moved; drag.current = null; }
  function moveScottchi(event: React.MouseEvent<HTMLDivElement>) {
    if (suppressMapClick.current) { suppressMapClick.current = false; return; }
    if ((event.target as HTMLElement).closest('button')) return;
    const bounds = event.currentTarget.querySelector('.world-map')?.getBoundingClientRect() || event.currentTarget.getBoundingClientRect();
    const petPosition = {
      x: Math.max(5, Math.min(95, Math.round((event.clientX - bounds.left) / bounds.width * 100))),
      y: Math.max(7, Math.min(93, Math.round((event.clientY - bounds.top) / bounds.height * 100))),
    };
    onChange({ ...data, world: { ...w, petPosition } });
  }

  return <section className="panel world-page" data-testid="world-page">
    <div className="panel-head"><div><div className="eyebrow">ERKUNDEN · LEVEL {level}</div><h2 className="panel-title">Scottchi World</h2></div><span className="stat-pill"><Compass size={15}/>{percent}% entdeckt</span></div>
    <div className="world-progress" aria-label={`${percent}% dauerhafte Erkundungsziele abgeschlossen`}><i style={{ width: `${percent}%` }}/></div>
    <div className="world-progress-caption">{permanentProgress} von {totalProgress} dauerhaften Zielen · wiederholte Funde erhöhen diesen Wert nicht</div>
    {worldEvent && <section className={`world-event-card ${eventClaimed ? 'claimed' : ''}`} data-testid="world-event-card">
      <div className="world-event-icon"><Sparkles size={20}/></div>
      <div className="world-event-copy"><b>Heute: {worldEvent.title}</b><small>{worldEvent.description} · {LOCATIONS.find((entry) => entry.id === worldEvent.locationId)?.name}</small></div>
      <button className="button small orange" onClick={() => eventClaimed ? undefined : worldEvent.locationId === location ? claimEvent() : enter(worldEvent.locationId)} disabled={eventClaimed} data-testid="button-world-event">
        {eventClaimed ? 'Heute gefunden' : worldEvent.locationId === location ? 'Ereignis bergen' : 'Zum Ereignis'}
      </button>
    </section>}
    <div className="world-layout">
      <div className="world-map-viewport" data-testid="world-map-viewport" onClick={moveScottchi} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(1, Math.min(2, value + (event.deltaY < 0 ? .1 : -.1)))); }}>
        <div className="world-map" style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})` }}>
          <img src={MAP} alt="Illustrierte Scottchi-Weltkarte mit Park, Stadt, Wald, Strand, Höhle und Berg" draggable={false}/>
          <div className="world-pet" style={{ left: `${w.petPosition.x}%`, top: `${w.petPosition.y}%` }} role="img" aria-label="Scottchi auf der Weltkarte">
            <img src={CHARACTER.default} alt="" draggable={false}/>
            <span>Scottchi</span>
          </div>
          {LOCATIONS.map((loc) => {
            const locked = level < loc.level;
            return <button key={loc.id} className={`world-marker ${location === loc.id ? 'selected' : ''} ${locked ? 'locked' : ''} ${w.discoveredLocations.includes(loc.id) ? 'visited' : ''}`} style={{ left: `${loc.point.x}%`, top: `${loc.point.y}%` }} onClick={() => enter(loc.id)} aria-label={`${loc.name}${locked ? `, ab Level ${loc.level}` : ''}`} data-testid={`world-place-${loc.id}`}><span>{locked ? <LockKeyhole size={15}/> : w.discoveredLocations.includes(loc.id) ? <Check size={15}/> : <MapPin size={15}/>}</span><small>{loc.name}</small></button>;
          })}
        </div>
        <div className="world-zoom"><button onClick={() => setZoom((value) => Math.max(1, value - .2))} aria-label="Karte verkleinern"><Minus size={15}/></button><button onClick={() => setZoom((value) => Math.min(2, value + .2))} aria-label="Karte vergrößern"><Plus size={15}/></button><button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} aria-label="Karte zurücksetzen"><Compass size={15}/></button></div>
        <span className="world-map-tip">Tippe auf ein Ziel, damit Scottchi dorthin läuft · Karte ziehen zum Verschieben</span>
      </div>
      <aside className="world-place panel" data-testid="world-place-details"><div className="eyebrow">ORT · AB LEVEL {place.level}</div><h3>{place.name}</h3><p>{place.desc}</p>
        <section className="world-mastery" aria-label={`${place.name} Gebietsmeisterschaft`}>
          <div className="world-mastery-heading"><span>Gebietsmeisterschaft</span><b>Stufe {masteryLevel(locationMastery)} / 20</b></div>
          <div className="world-mastery-bar"><i style={{ width: `${masteryProgress(locationMastery)}%` }}/></div>
          <small>{locationMastery} Meisterschafts-XP · {questCount.completed}/{questCount.total} Hauptquests · {locationDiscoveries} dauerhafte Geheimnisse</small>
        </section>
        {npc && <section className={`world-npc ${npcClaimed ? 'done' : ''}`} data-testid={`world-npc-${npc.id}`}>
          <div className="world-section-heading"><MapPin size={15}/><b>{npc.name} · {npc.role}</b><small>Wiederkehrender Auftrag</small></div>
          <p>{npc.dialogue}</p>
          <small>{npc.request} Belohnung: {npc.rewardCoins} Münzen · {npc.rewardXp} XP.</small>
          <button className="button small" onClick={claimNpc} disabled={npcClaimed} data-testid={`button-npc-${npc.id}`}>{npcClaimed ? 'Heute erledigt' : 'Material abgeben'}</button>
        </section>}
        <section className="world-daily" data-testid="world-daily-goals">
          <div className="world-section-heading"><Sparkles size={15}/><b>Heutige Erkundungsziele</b><small>Reset 04:00 · Berlin</small></div>
          {(w.dailyGoals || []).map((id) => {
            const goal = DAILY_WORLD_GOALS.find((entry) => entry.id === id);
            if (!goal) return null;
            const count = Math.min(goal.target, w.dailyMetrics[goal.metric] || 0);
            const done = !!w.dailyClaimed?.includes(goal.id);
            return <div className={`world-daily-row ${done ? 'done' : ''}`} key={goal.id}>
              <span><b>{goal.title}</b><small>{goal.description}</small></span><strong>{done ? 'Erledigt' : `${count}/${goal.target}`}</strong>
            </div>;
          })}
          {!w.dailyGoals?.length && <small>Deine Tagesziele werden vorbereitet.</small>}
          <small className="world-daily-foot">Keine Abwesenheitsstrafe · Belohnungen pro Ziel nur einmal täglich.</small>
        </section>
        <section className="world-weekly" data-testid="world-weekly-goals">
          <div className="world-section-heading"><Compass size={15}/><b>Wochenziele</b><small>Reset Montag · 04:00</small></div>
          {WEEKLY_WORLD_GOALS.map((goal) => {
            const count = Math.min(goal.target, w.weeklyMetrics[goal.metric] || 0);
            const done = w.weeklyClaimed.includes(goal.id);
            return <div className={`world-daily-row ${done ? 'done' : ''}`} key={goal.id}>
              <span><b>{goal.title}</b><small>{goal.description}</small></span><strong>{done ? 'Erledigt' : `${count}/${goal.target}`}</strong>
            </div>;
          })}
          <small className="world-daily-foot">Keine Strafe für verpasste Tage · Belohnungen pro Woche nur einmal.</small>
        </section>
        <section className="world-resources" data-testid="world-resource-nodes">
          <div className="world-section-heading"><Trees size={15}/><b>Fundstellen</b><small>Persönlich · erneuern sich</small></div>
          <div className="world-resource-list">{locationNodes.map((node) => {
            const remaining = hoursRemaining(w.resourceCollectedAt[node.id], node.respawnHours, now);
            const ready = remaining <= 0;
            const masteryLocked = !!node.minMastery && masteryLevel(w.areaMastery[location] || 0) < node.minMastery;
            const item = itemById(node.resourceId)!;
            return <article className={`world-resource ${ready ? 'ready' : 'exhausted'} rarity-${node.rarity.toLowerCase()}`} key={node.id} data-testid={`resource-node-${node.id}`}>
              <span className="world-resource-art"><MaterialArt item={item} size={36}/></span>
              <span className="world-resource-copy"><b>{node.activity ? `Ausgrabung · ${item.name}` : item.name}</b><small>{node.rarity} · +{node.quantity} · {node.respawnHours} Std. Erneuerung{node.minMastery ? ` · Meisterschaft ${node.minMastery}` : ''}</small></span>
              <button className="button small" onClick={() => node.activity ? startExcavation(node.id) : gather(node.id)} disabled={!ready || masteryLocked || (!!node.activity && !!dig)} data-testid={`button-resource-${node.id}`}>
                {masteryLocked ? <><LockKeyhole size={12}/> Stufe {node.minMastery}</> : ready ? node.activity ? <><Pickaxe size={13}/> Graben</> : 'Sammeln' : <><Clock3 size={12}/>{formatRemaining(remaining)}</>}
              </button>
            </article>;
          })}</div>
          {dig && locationNodes.some((node) => node.id === dig.nodeId) && <div className="world-dig-game" data-testid="excavation-game">
            <b>{dig.showing ? 'Merke dir die Fundzeichen' : 'Tippe die Zeichen in derselben Reihenfolge'}</b>
            <div className="dig-sequence" aria-live="polite">{dig.showing ? dig.sequence.map((item, index) => <span key={index}>{['●', '◆', '✦', '■'][item]}</span>) : dig.progress.map((item, index) => <span key={index}>{['●', '◆', '✦', '■'][item]}</span>)}</div>
            <div className="dig-buttons">{['●', '◆', '✦', '■'].map((symbol, index) => <button key={symbol} className="button small" disabled={dig.showing} onClick={() => tapDig(index)} aria-label={`Fundzeichen ${index + 1}`}>{symbol}</button>)}</div>
            <small>{dig.showing ? 'Die Zeichen verschwinden gleich.' : `${dig.progress.length} von ${dig.sequence.length} Zeichen richtig`}</small>
            <button className="button small ghost" onClick={() => setDig(null)}>Abbrechen</button>
          </div>}
        </section>
        {location === 'beach' && <section className="world-fishing" data-testid="world-fishing">
          <div className="world-section-heading"><Fish size={15}/><b>Angelplatz</b><small>{Math.max(0, 3 - (w.fishingRewardsToday || 0))} Tagesfänge übrig</small></div>
          <p>{fishing === 'waiting' ? 'Die Pose bewegt sich leicht. Warte auf den Biss …' : fishing === 'bite' ? 'Jetzt! Der Fisch hat angebissen!' : fishing === 'missed' ? 'Der Fisch ist entkommen. Versuch es noch einmal.' : 'Wirf die Angel aus und hol sie im richtigen Moment wieder ein.'}</p>
          {fishing === 'bite' ? <button className="button orange fish-reel" onClick={reelFish} data-testid="button-reel-fish"><Fish size={15}/> Jetzt einholen!</button>
            : <button className="button" onClick={startFishing} disabled={fishing === 'waiting'} data-testid="button-cast-fishing">{fishing === 'waiting' ? 'Warten …' : fishing === 'missed' ? 'Noch einmal auswerfen' : 'Angel auswerfen'}</button>}
          {(w.fishingRewardsToday || 0) >= 3 && <small>Weitere Runden bleiben als Übung spielbar, geben aber heute keine zusätzlichen Materialien.</small>}
        </section>}
        <div className="world-quest-list"><strong>Hauptquests & Rätsel</strong>
        {placeQuests.length ? placeQuests.map((entry) => {
          const done = w.completedQuests.includes(entry.id);
          const current = (w.activeQuests || []).includes(entry.id);
          const count = w.questProgress[entry.id] || 0;
          return <button className={`world-quest ${done ? 'completed' : ''}`} key={entry.id} onClick={() => openQuest(entry.id)} data-testid={`world-quest-${entry.id}`}>
            <span>{done ? <Check size={16}/> : <Search size={16}/>}</span>
            <div><b>{entry.name}</b><small>{done ? 'Abgeschlossen · Belohnung bereits vergeben' : current ? `Aktiv · ${count}/${entry.target} Funde` : entry.desc} · ${entry.coins} Münzen + ${entry.xp} XP</small></div>
          </button>;
        }) : <p className="future-place">Dieses Gebiet ist als zukünftiger Inhalt markiert und bietet noch keine spielbare Aktivität.</p>}
       </div>
       {location === 'city' && <div className="city-vendors"><strong>Händler am Platz</strong><p>Besuche den Stadtladen oder schau bei der Kostümhändlerin vorbei.</p><button className="button small" onClick={() => onStore('food')} data-testid="button-city-store">Stadtladen besuchen</button><button className="button small orange" onClick={() => onStore('accessory')} data-testid="button-city-fashion">Kostümhändlerin</button></div>}
     </aside>
    </div>
    {currentQuest && <div className="quest-backdrop" role="presentation"><section className="quest-dialog panel" role="dialog" aria-modal="true" aria-labelledby="quest-title">
      <div className="panel-head"><div><div className="eyebrow">{completed ? 'ABGESCHLOSSENE AUFGABE' : 'SPIELBARE AKTIVITÄT'}</div><h3 id="quest-title">{currentQuest.name}</h3></div><button className="button small ghost" onClick={() => setQuest(null)}><ChevronLeft size={15}/> Zurück</button></div>
      <p>{currentQuest.desc} {completed ? <b>Erledigt – die Belohnung wurde bereits vergeben.</b> : awaitingAction ? <b>Letzter Schritt: {currentQuest.requiresAction === 'use:ball' ? 'Wechsle zum Zuhause und benutze den Ball.' : 'Führe die Aktion unten aus.'}</b> : <>Suche in der Szene: <b>{progress}/{currentQuest.target}</b>.</>}</p>
      <div className={`quest-scene quest-${currentQuest.id}`} data-testid="quest-scene">
        <img src={MAP} alt="" draggable={false}/>
        {pickupPoints.slice(0, currentQuest.target).map((point, index) => {
          const found = foundPoints.includes(index);
          const shownIndex = 'sequence' in currentQuest && currentQuest.sequence ? currentQuest.sequence.indexOf(index) + 1 : index + 1;
          return <button key={index} className={`quest-pickup ${found ? 'found' : ''}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => pick(index)} disabled={found || completed || awaitingAction} aria-label={`${found ? 'Gefunden' : 'Suchziel'} ${shownIndex}`} data-testid={`quest-pickup-${index}`}>
             {found ? <Check/> : currentQuest.id.includes('bones') ? <img src={assetUrl('collections/items/bone-cream.png')} alt="Knochen"/> : currentQuest.id.includes('lantern') ? <Sparkles/> : currentQuest.id.includes('riddle') ? <span className="riddle-point">{index + 1}</span> : currentQuest.id.includes('delivery') ? <span>▣</span> : currentQuest.id.includes('shells') ? <span>🐚</span> : currentQuest.id.includes('lost-toy') ? <span>🔎</span> : <img src={assetUrl('collections/items/tennisball-green.png')} alt="Fundstück"/>}
          </button>;
        })}
      </div>
      {awaitingAction && currentQuest.requiresAction === 'open:treasure' && <button className="button orange" onClick={completeAction} style={{ marginTop: 12 }} data-testid="button-open-treasure">Truhe ausgraben & öffnen</button>}
      {!completed && !awaitingAction && <p className="subline">Jeder Fund wird sofort ins Inventar gelegt. Der Fortschritt bleibt auch nach dem Schließen gespeichert.</p>}
      {awaitingAction && (currentQuest.requiresAction === 'use:ball' || currentQuest.requiresAction === 'use:frisbee') && <p className="subline">Das Spielzeug wurde deinem Schrank hinzugefügt. Wechsle ins Spielzimmer und wirf es, um die Aufgabe abzuschließen.</p>}
    </section></div>}
    {foundItems.size > 0 && <div className="world-found" data-testid="world-discoveries"><Sparkles size={16}/>{foundItems.size} Weltfunde im Sammelalbum · Materialien landen im Inventar</div>}
  </section>;
}
