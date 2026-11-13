import { useMemo, useState } from 'react';
import { Check, LockKeyhole, Sparkles, X } from 'lucide-react';
import type { FullPetData } from './data';
import { COLLECTION_ITEMS, COLLECTION_CATEGORIES, COLLECTION_REWARDS, RARITIES, RARITY_LABEL, type Rarity } from './world';
import { assetUrl } from './assets';

const ITEM_LINKS:Record<string,string>={'cap-red':'baseballcap','beanie-dark':'beanie','cowboy-star':'cowboy-hat','crown-ruby':'crown','wizard-purple':'wizard-hat','sleep-cap-blue':'sleep-cap','hoodie-dark':'hoodie','raincoat-gold':'raincoat','tuxedo':'tuxedo','hero-cape-blue':'cape','royal-cape':'cape','royal-armor':'tuxedo','scarf-red':'scarf','collar-bone':'collar','glasses-dark':'sunglasses','bone-cream':'bone-toy','tennisball-green':'ball','duck':'duck','frisbee-red':'frisbee','rope-red':'rope','teddy':'teddy','bowl':'bowl','bottle-pink':'shampoo','flower-pot':'plant'};
type Props={data:FullPetData;onClaim:(id:string,name:string,coins:number,xp:number)=>void};
export function CollectionsPage({data,onClaim}:Props){
 const [category,setCategory]=useState('Alle');const [rarity,setRarity]=useState('Alle');const [selected,setSelected]=useState<string|null>(null);
 const owned=new Set([...(data.collectionIds||[]),...data.world.discoveries]);
 const hasItem=(id:string)=>owned.has(id)||!!ITEM_LINKS[id]&&data.owned.includes(ITEM_LINKS[id]);
 const list=useMemo(()=>COLLECTION_ITEMS.filter(i=>(category==='Alle'||i.category===category)&&(rarity==='Alle'||i.rarity===rarity)),[category,rarity]);
 const found=COLLECTION_ITEMS.filter(i=>owned.has(i.id)||!!ITEM_LINKS[i.id]&&data.owned.includes(ITEM_LINKS[i.id])).length;
 const item=COLLECTION_ITEMS.find(i=>i.id===selected);
 return <section className="panel collections-page" data-testid="collections-page">
   <div className="panel-head"><div><div className="eyebrow">SAMMELN · ENTDECKEN</div><h2 className="panel-title">Scottchi Collections</h2></div><span className="stat-pill"><Sparkles size={14}/>{found}/{COLLECTION_ITEMS.length}</span></div>
   <div className="collection-progress"><i style={{width:`${found/COLLECTION_ITEMS.length*100}%`}}/></div>
   <p className="subline">{Math.round(found/COLLECTION_ITEMS.length*100)} % entdeckt · {found} von {COLLECTION_ITEMS.length} Fundstücken</p>
   <section className="collection-reward-grid" aria-label="Sammlungsbelohnungen">{COLLECTION_REWARDS.map(r=>{const complete=r.items.every(hasItem);const claimed=data.world.claimedRewards.includes(r.id);return <div className={`collection-reward ${complete?'earned':''}`} key={r.id}><Sparkles size={15}/><span><b>{r.name}</b><small>{r.reward} · {claimed?'Abgeholt':complete?'Bereit':'Noch offen'}</small></span>{complete&&!claimed&&<button className="button small" onClick={()=>onClaim(r.id,r.reward,40,25)}>Abholen</button>}{claimed&&<Check size={16}/>}</div>})}</section>
   <div className="collection-filters"><label>Kategorie<select value={category} onChange={e=>setCategory(e.target.value)} data-testid="collection-category"><option>Alle</option>{COLLECTION_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Seltenheit<select value={rarity} onChange={e=>setRarity(e.target.value)} data-testid="collection-rarity"><option>Alle</option>{RARITIES.map(r=><option key={r} value={r}>{RARITY_LABEL[r]}</option>)}</select></label></div>
   <div className="collection-grid" data-testid="collection-grid">{list.map(i=>{const has=hasItem(i.id);return <button key={i.id} className={`collection-card rarity-${i.rarity.toLowerCase()} ${has?'found':'unknown'}`} onClick={()=>setSelected(i.id)} data-testid={`collection-item-${i.id}`} aria-label={has?i.name:'Unentdecktes Sammelstück'}><span className="collection-sprite"><img src={assetUrl(`collections/items/${i.id}.png`)} alt="" loading="lazy" decoding="async"/></span><strong>{has?i.name:'???'}</strong><small>{RARITY_LABEL[i.rarity]}</small>{has?<Check className="collection-check" size={13}/>:<LockKeyhole className="collection-check" size={13}/>}</button>})}</div>
   {item&&<div className="quest-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className={`collection-detail panel rarity-${item.rarity.toLowerCase()}`} role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="button small collection-close" onClick={()=>setSelected(null)} aria-label="Schließen"><X size={16}/></button><img className="collection-detail-img" src={assetUrl(`collections/items/${item.id}.png`)} alt={item.name}/><div className="eyebrow">{item.category}</div><h3>{hasItem(item.id)?item.name:'Unbekannter Fund'}</h3><span className={`rarity-label rarity-${item.rarity.toLowerCase()}`}>{RARITY_LABEL[item.rarity]}</span><p>{item.name} ist ein Sammelstück aus der Welt von Scottchi.</p><p><b>Fundort:</b> {item.where}<br/><b>Freischaltung:</b> {item.condition}<br/><b>Besitz:</b> {hasItem(item.id)?'Entdeckt':'Noch nicht gefunden'}</p></section></div>}
 </section>;
}
