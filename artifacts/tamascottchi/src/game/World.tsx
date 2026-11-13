import { useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Compass, LockKeyhole, MapPin, Minus, Plus, Search, Sparkles } from 'lucide-react';
import { LOCATIONS, WORLD_QUESTS, type FullPetData } from './data';
import { COLLECTION_ITEMS } from './world';
import { assetUrl } from './assets';

const MAP = assetUrl('world/scottchi-world-map.webp');
const pickupPoints = [
  { x: 16, y: 24 }, { x: 28, y: 38 }, { x: 39, y: 25 }, { x: 56, y: 43 }, { x: 67, y: 28 },
  { x: 82, y: 44 }, { x: 76, y: 65 }, { x: 58, y: 67 }, { x: 39, y: 76 }, { x: 22, y: 60 },
];

type Props = { data: FullPetData; level: number; onChange: (data: FullPetData) => void; award: (coins:number,xp:number) => void };
export function World({data,level,onChange,award}:Props){
  const [location,setLocation]=useState('park');
  const [quest,setQuest]=useState<string|null>(null);
  const [zoom,setZoom]=useState(1);
  const [offset,setOffset]=useState({x:0,y:0});
  const [picked,setPicked]=useState<number[]>([]);
  const drag=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
  const w=data.world;
  const foundItems=useMemo(()=>new Set(w.discoveries),[w.discoveries]);
  const place=LOCATIONS.find(l=>l.id===location)!;
  const placeQuests=WORLD_QUESTS.filter(q=>q.place===location);
  const currentQuest=WORLD_QUESTS.find(q=>q.id===quest);
  const totalProgress=LOCATIONS.length+WORLD_QUESTS.length+COLLECTION_ITEMS.length;
  const percent=Math.floor((w.discoveredLocations.length+w.completedQuests.length+w.discoveries.length)/totalProgress*100);
  function discover(id:string){
    if(foundItems.has(id))return;
    onChange({...data,world:{...w,discoveries:[...w.discoveries,id]},collectionIds:[...new Set([...data.collectionIds,id])]});
  }
  function enter(id:string){
    const loc=LOCATIONS.find(x=>x.id===id);
    if(!loc||level<loc.level)return;
    setLocation(id);setQuest(null);setPicked([]);
    if(!w.discoveredLocations.includes(id))onChange({...data,world:{...w,discoveredLocations:[...w.discoveredLocations,id]}});
  }
  function pick(i:number){
    if(!currentQuest||picked.includes(i)||w.completedQuests.includes(currentQuest.id))return;
    const nextPicked=[...picked,i];setPicked(nextPicked);
    const progress=Math.min(currentQuest.target,(w.questProgress[currentQuest.id]||0)+1);
    const done=progress>=currentQuest.target;
    const completed=done?[...new Set([...w.completedQuests,currentQuest.id])]:w.completedQuests;
    const discoveries=[...new Set([...w.discoveries,...(done?currentQuest.discoveries:[])])];
    onChange({...data,collectionIds:[...new Set([...data.collectionIds,...(done?currentQuest.discoveries:[])])],
      world:{...w,questProgress:{...w.questProgress,[currentQuest.id]:progress},completedQuests:completed,discoveries}});
    if(done){award(currentQuest.coins,currentQuest.xp);setQuest(null);setPicked([]);}
  }
  function pointerDown(e:React.PointerEvent<HTMLDivElement>){if((e.target as HTMLElement).closest('button'))return; e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y};}
  function pointerMove(e:React.PointerEvent<HTMLDivElement>){if(!drag.current)return;setOffset({x:Math.min(200,Math.max(-200,drag.current.ox+(e.clientX-drag.current.x))),y:Math.min(100,Math.max(-100,drag.current.oy+(e.clientY-drag.current.y)))});}
  function pointerUp(){drag.current=null;}
  return <section className="panel world-page" data-testid="world-page">
    <div className="panel-head"><div><div className="eyebrow">ERKUNDEN · LEVEL {level}</div><h2 className="panel-title">Scottchi World</h2></div><span className="stat-pill"><Compass size={15}/>{percent}% entdeckt</span></div>
    <div className="world-progress"><i style={{width:`${percent}%`}}/></div>
    <div className="world-layout">
      <div className="world-map-viewport" data-testid="world-map-viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={e=>{e.preventDefault();setZoom(z=>Math.max(1,Math.min(2,z+(e.deltaY<0?.1:-.1))))}}>
        <div className="world-map" style={{transform:`translate(${offset.x}px,${offset.y}px) scale(${zoom})`}}>
          <img src={MAP} alt="Illustrierte Scottchi-Weltkarte mit Park, Stadt, Wald, Strand, Höhle und Berg" draggable={false}/>
          {LOCATIONS.map(loc=>{const locked=level<loc.level;return <button key={loc.id} className={`world-marker ${location===loc.id?'selected':''} ${locked?'locked':''} ${w.discoveredLocations.includes(loc.id)?'visited':''}`} style={{left:`${loc.point.x}%`,top:`${loc.point.y}%`}} onClick={()=>enter(loc.id)} aria-label={`${loc.name}${locked?`, ab Level ${loc.level}`:''}`} data-testid={`world-place-${loc.id}`}><span>{locked?<LockKeyhole size={15}/>:w.discoveredLocations.includes(loc.id)?<Check size={15}/>:<MapPin size={15}/>}</span><small>{loc.name}</small></button>})}
        </div>
        <div className="world-zoom"><button onClick={()=>setZoom(z=>Math.max(1,z-.2))} aria-label="Karte verkleinern"><Minus size={15}/></button><button onClick={()=>setZoom(z=>Math.min(2,z+.2))} aria-label="Karte vergrößern"><Plus size={15}/></button><button onClick={()=>{setZoom(1);setOffset({x:0,y:0})}} aria-label="Karte zurücksetzen"><Compass size={15}/></button></div>
        <span className="world-map-tip">Ziehen zum Erkunden · Mausrad oder Tasten zum Zoomen</span>
      </div>
      <aside className="world-place panel" data-testid="world-place-details"><div className="eyebrow">ORT · AB LEVEL {place.level}</div><h3>{place.name}</h3><p>{place.desc}</p><div className="world-quest-list"><strong>Aufgaben</strong>
        {placeQuests.length?placeQuests.map(q=>{const done=w.completedQuests.includes(q.id);return <button className={`world-quest ${done?'completed':''}`} key={q.id} onClick={()=>{setQuest(q.id);const n=done?0:(w.questProgress[q.id]||0);setPicked(Array.from({length:n},(_,i)=>i));if(done)onChange({...data,world:{...w,questProgress:{...w.questProgress,[q.id]:0}}})}} data-testid={`world-quest-${q.id}`}><span>{done?<Check size={16}/>:<Search size={16}/>}</span><div><b>{q.name}</b><small>{done?'Wiederholbar · Belohnung einmalig':q.desc} · {q.coins} Münzen + {q.xp} XP</small></div></button>}):<p className="subline">Hier entsteht ein neues Gebiet. Für Version 3.0 noch nicht spielbar.</p>}
      </div></aside>
    </div>
    {currentQuest&&<div className="quest-backdrop" role="presentation"><section className="quest-dialog panel" role="dialog" aria-modal="true" aria-labelledby="quest-title">
      <div className="panel-head"><div><div className="eyebrow">INTERAKTIVE SUCHE</div><h3 id="quest-title">{currentQuest.name}</h3></div><button className="button small ghost" onClick={()=>setQuest(null)}><ChevronLeft size={15}/> Zurück</button></div>
      <p>{currentQuest.desc} Tippe die Dinge direkt in der Szene an: <b>{picked.length}/{currentQuest.target}</b>.</p>
      <div className={`quest-scene quest-${currentQuest.id}`} data-testid="quest-scene">
        <img src={MAP} alt="" draggable={false}/>
        {pickupPoints.slice(0,currentQuest.target).map((p,i)=><button key={i} className={`quest-pickup ${picked.includes(i)?'found':''}`} style={{left:`${p.x}%`,top:`${p.y}%`}} onClick={()=>pick(i)} aria-label={`${picked.includes(i)?'Gefunden':'Verstecktes Ziel'} ${i+1}`} data-testid={`quest-pickup-${i}`}>{picked.includes(i)?<Check/>:currentQuest.id.includes('bones')?<img src="/assets/collections/items/bone-cream.png" alt="Knochen"/>:currentQuest.id.includes('lantern')?<Sparkles/>:currentQuest.id.includes('delivery')?<span>▣</span>:<img src="/assets/collections/items/tennisball-green.png" alt="Picknickfund"/>}</button>)}
      </div>
      <p className="subline">Jeder Fund wird sofort gespeichert. Abschluss und Belohnung erfolgen genau einmal.</p>
    </section></div>}
    {foundItems.size>0&&<div className="world-found" data-testid="world-discoveries"><Sparkles size={16}/>{foundItems.size} Weltfunde im Sammelalbum</div>}
  </section>;
}
