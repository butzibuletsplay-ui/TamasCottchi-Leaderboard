import { useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Compass, LockKeyhole, MapPin, Minus, Plus, Search, Sparkles } from 'lucide-react';
import { LOCATIONS, WORLD_QUESTS, itemById, type FullPetData } from './data';
import { COLLECTION_ITEMS } from './world';
import { assetUrl, CHARACTER } from './assets';
import { completeQuestAction, pickQuestPoint, startQuest } from './questEngine';

const MAP = assetUrl('world/scottchi-world-map.webp');
const pickupPoints = [
  { x: 16, y: 24 }, { x: 28, y: 38 }, { x: 39, y: 25 }, { x: 56, y: 43 }, { x: 67, y: 28 },
  { x: 82, y: 44 }, { x: 76, y: 65 }, { x: 58, y: 67 }, { x: 39, y: 76 }, { x: 22, y: 60 },
];

type Props = { data: FullPetData; level: number; onChange: (data: FullPetData) => void; onNotice: (message: string) => void; onStore: (tab: 'food' | 'accessory') => void };
export function World({ data, level, onChange, onNotice, onStore }: Props) {
  const [location, setLocation] = useState('park');
  const [quest, setQuest] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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
  const percent = Math.floor((w.discoveredLocations.length + w.completedQuests.length + w.discoveries.length) / totalProgress * 100);

  function enter(id: string) {
    const target = LOCATIONS.find((entry) => entry.id === id);
    if (!target) return;
    if (level < target.level) { onNotice(`Ab Level ${target.level} freigeschaltet.`); return; }
    setLocation(id); setQuest(null);
    const firstVisit = !w.discoveredLocations.includes(id);
    onChange({
      ...data,
      world: { ...w, petPosition: target.point, discoveredLocations: firstVisit ? [...w.discoveredLocations, id] : w.discoveredLocations },
      journal: firstVisit ? [...data.journal, { id: `location-${id}`, date: Date.now(), icon: '🗺️', title: `Ort entdeckt: ${target.name}`, detail: target.desc }].slice(-100) : data.journal,
    });
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
    <div className="world-progress"><i style={{ width: `${percent}%` }}/></div>
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
      <aside className="world-place panel" data-testid="world-place-details"><div className="eyebrow">ORT · AB LEVEL {place.level}</div><h3>{place.name}</h3><p>{place.desc}</p><div className="world-quest-list"><strong>Aktivitäten & Aufgaben</strong>
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
