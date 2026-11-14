import { useMemo, useState } from 'react';
import { Check, LockKeyhole, Sparkles, X } from 'lucide-react';
import type { FullPetData } from './data';
import { COLLECTION_ITEMS, COLLECTION_CATEGORIES, COLLECTION_ITEM_LINKS, COLLECTION_REWARDS, RARITIES, RARITY_LABEL, type Rarity } from './collectionWorld';
import { itemById } from './data';
import { assetUrl } from './assets';

type Props={data:FullPetData;onClaim:(id:string,name:string,coins:number,xp:number)=>void};
export function CollectionsPage({data,onClaim}:Props){
 const [category,setCategory]=useState('Alle');const [rarity,setRarity]=useState('Alle');const [selected,setSelected]=useState<string|null>(null);
 const owned=new Set([...(data.collectionIds||[]),...data.world.discoveries]);
 const hasItem=(id:string)=>owned.has(id)||!!COLLECTION_ITEM_LINKS[id]&&data.owned.includes(COLLECTION_ITEM_LINKS[id]);
 const list=useMemo(()=>COLLECTION_ITEMS.filter(i=>(category==='Alle'||i.category===category)&&(rarity==='Alle'||i.rarity===rarity)),[category,rarity]);
 const found=COLLECTION_ITEMS.filter(i=>owned.has(i.id)||!!COLLECTION_ITEM_LINKS[i.id]&&data.owned.includes(COLLECTION_ITEM_LINKS[i.id])).length;
 const item=COLLECTION_ITEMS.find(i=>i.id===selected);
 const linkedId=item?COLLECTION_ITEM_LINKS[item.id]:undefined;
 const linkedItem=linkedId?itemById(linkedId):undefined;
 const linkedCount=linkedItem?((data.inventory[linkedId!]||0)|| (data.owned.includes(linkedId!)?1:0)):0;
 return <section className="panel collections-page" data-testid="collections-page">
   <div className="panel-head"><div><div className="eyebrow">SAMMELN · ENTDECKEN</div><h2 className="panel-title">Scottchi Collections</h2></div><span className="stat-pill"><Sparkles size={14}/>{found}/{COLLECTION_ITEMS.length}</span></div>
   <div className="collection-progress"><i style={{width:`${found/COLLECTION_ITEMS.length*100}%`}}/></div>
   <p className="subline">{Math.round(found/COLLECTION_ITEMS.length*100)} % entdeckt · {found} von {COLLECTION_ITEMS.length} Fundstücken</p>
   <section className="collection-reward-grid" aria-label="Sammlungsbelohnungen">{COLLECTION_REWARDS.map(r=>{const complete=r.items.every(hasItem);const claimed=data.world.claimedRewards.includes(r.id);return <div className={`collection-reward ${complete?'earned':''}`} key={r.id}><Sparkles size={15}/><span><b>{r.name}</b><small>{r.reward} · {claimed?'Abgeholt':complete?'Bereit':'Noch offen'}</small></span>{complete&&!claimed&&<button className="button small" onClick={()=>onClaim(r.id,r.reward,40,25)}>Abholen</button>}{claimed&&<Check size={16}/>}</div>})}</section>
   <div className="collection-filters"><label>Kategorie<select value={category} onChange={e=>setCategory(e.target.value)} data-testid="collection-category"><option>Alle</option>{COLLECTION_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Seltenheit<select value={rarity} onChange={e=>setRarity(e.target.value)} data-testid="collection-rarity"><option>Alle</option>{RARITIES.map(r=><option key={r} value={r}>{RARITY_LABEL[r]}</option>)}</select></label></div>
   <div className="collection-grid" data-testid="collection-grid">{list.map(i=>{const has=hasItem(i.id);return <button key={i.id} className={`collection-card rarity-${i.rarity.toLowerCase()} ${has?'found':'unknown'}`} onClick={()=>setSelected(i.id)} data-testid={`collection-item-${i.id}`} aria-label={has?i.name:'Unentdecktes Sammelstück'}><span className="collection-sprite" style={{backgroundImage:`url("${assetUrl(`rewards/frames/${i.rarity.toLowerCase()}.png`)}")`}}><img src={assetUrl(`collections/items/${i.id}.png`)} alt="" loading="lazy" decoding="async"/></span><strong>{has?i.name:'???'}</strong><small>{RARITY_LABEL[i.rarity]}</small>{has?<Check className="collection-check" size={13}/>:<LockKeyhole className="collection-check" size={13}/>}</button>})}</div>
   {item&&<div className="quest-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className={`collection-detail panel rarity-${item.rarity.toLowerCase()}`} role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="button small collection-close" onClick={()=>setSelected(null)} aria-label="Schließen"><X size={16}/></button><div className="collection-detail-preview" style={{backgroundImage:`url("${assetUrl(`rewards/frames/${item.rarity.toLowerCase()}.png`)}")`}}><img src={assetUrl(`collections/items/${item.id}.png`)} alt={item.name}/></div><div className="eyebrow">{item.category}</div><h3>{hasItem(item.id)?item.name:'Unbekannter Fund'}</h3><span className={`rarity-label rarity-${item.rarity.toLowerCase()}`}>{RARITY_LABEL[item.rarity]}</span><p>{item.name} ist ein Sammlungsfund aus der Scottchi-Welt.</p><p><b>Fundort:</b> {item.where}<br/><b>Freischaltung:</b> {item.condition}<br/><b>Albumstatus:</b> {hasItem(item.id)?'Entdeckt · einmal im Album':'Noch nicht gefunden'}</p><p><b>Spielzweck:</b> {linkedItem?`${linkedItem.name} ist das zugehörige Inventarobjekt${linkedItem.type==='accessory'?' und kann im Schrank angelegt werden':linkedItem.type==='toy'?' und kann im Zuhause benutzt werden':linkedItem.type==='room'?' und kann im Zimmer platziert werden':'.'}.`:'Reiner Album-Sammelfund ohne eigenen aktiven Effekt; er bleibt als Entdeckung im Sammelalbum.'}<br/><b>Inventar:</b> {linkedItem?(linkedCount?`×${linkedCount} ${linkedItem.name}`:'Kein zugehöriges Inventarobjekt im Besitz'):(hasItem(item.id)?'×1 Albumfund':'—')}</p></section></div>}
 </section>;
}
