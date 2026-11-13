import { useMemo, useState } from 'react';
import { Box, Check, Info, Sparkles, X } from 'lucide-react';
import type { FullPetData, Item } from './data';
import { ITEMS } from './data';

type Props = {
  data: FullPetData;
  onUse: (id: string) => void;
  onEquip: (id: string) => void;
  onPlace: (id: string) => void;
};

function quantity(data: FullPetData, item: Item) {
  const count = data.inventory[item.id] || 0;
  return count > 0 ? count : data.owned.includes(item.id) ? 1 : 0;
}
function category(item: Item) {
  if (item.type === 'food') return 'Benutzbar';
  if (item.type === 'toy') return item.id === 'shampoo' ? 'Pflege' : 'Spielzeug';
  if (item.type === 'accessory') return 'Ausrüstung';
  if (item.type === 'room') return 'Dekoration';
  if (item.type === 'background') return 'Zimmermotiv';
  return 'Material';
}
function rarity(item: Item) {
  return item.rarity || (item.type === 'accessory' && ['crown', 'wizard-hat', 'tuxedo', 'cape'].includes(item.id) ? 'Selten' : 'Gewöhnlich');
}
function purpose(item: Item) {
  return item.purpose || item.desc || (item.type === 'food' ? 'Wird verbraucht und füllt ein Bedürfnis.' :
    item.type === 'toy' ? 'Dauerhaftes Spielzeug für Scottchi.' :
      item.type === 'accessory' ? 'Kosmetisch: kann im Schrank angelegt werden.' :
        item.type === 'room' ? 'Dekoration: kann im Zimmer aufgestellt werden.' :
          item.type === 'background' ? 'Kosmetisches Zimmermotiv.' : 'Wird für Rezepte verwendet.');
}
function origin(item: Item) {
  return item.origin || (item.type === 'material' ? 'Welt-Erkundung' : item.craftOnly ? 'Werkstatt · Crafting' : 'Shop');
}

export function InventoryPage({ data, onUse, onEquip, onPlace }: Props) {
  const [filter, setFilter] = useState('Alle');
  const [selected, setSelected] = useState<string | null>(null);
  const categories = ['Alle', 'Benutzbar', 'Pflege', 'Spielzeug', 'Ausrüstung', 'Dekoration', 'Zimmermotiv', 'Material'];
  const items = useMemo(() => ITEMS
    .filter((item) => quantity(data, item) > 0)
    .filter((item) => filter === 'Alle' || category(item) === filter)
    .sort((a, b) => a.name.localeCompare(b.name, 'de')), [data, filter]);
  const item = ITEMS.find((entry) => entry.id === selected);
  const count = item ? quantity(data, item) : 0;

  function actionFor(selectedItem: Item) {
    if (selectedItem.type === 'food') return <button className="button orange" onClick={() => { onUse(selectedItem.id); setSelected(null); }}>Benutzen · 1</button>;
    if (selectedItem.type === 'toy' && selectedItem.id !== 'bowl') return <button className="button orange" onClick={() => { onUse(selectedItem.id); setSelected(null); }}>{selectedItem.id === 'shampoo' ? 'Im Bad waschen · 1 Flasche' : selectedItem.id === 'ball' || selectedItem.id === 'frisbee' ? 'Im Spielzimmer werfen' : 'Mit Scottchi spielen'}</button>;
    if (selectedItem.id === 'bowl') return <span className="inventory-readonly"><Sparkles size={15}/> Passiver Effekt: Mahlzeiten sättigen stärker. Der Napf bleibt im Zuhause sichtbar.</span>;
    if (selectedItem.type === 'accessory' || selectedItem.type === 'background') return <button className="button orange" onClick={() => { onEquip(selectedItem.id); setSelected(null); }}>{selectedItem.type === 'background' ? data.activeBackground === selectedItem.id ? 'Zimmermotiv entfernen' : 'Zimmermotiv anwenden' : data.equipped.includes(selectedItem.id) ? 'Ablegen' : 'Anziehen'}</button>;
    if (selectedItem.type === 'room') return <button className="button orange" onClick={() => { onPlace(selectedItem.id); setSelected(null); }}>{data.roomItems.includes(selectedItem.id) ? 'Aus dem Zimmer nehmen' : 'Im Zimmer platzieren'}</button>;
    return <span className="inventory-readonly"><Info size={15}/> Wird beim Crafting eingesetzt.</span>;
  }

  return <section className="panel inventory-page" data-testid="inventory-page">
    <div className="panel-head"><div><div className="eyebrow">DEINE GESAMTEN FUNDSTÜCKE</div><h2 className="panel-title">Inventar</h2></div><span className="stat-pill"><Box size={15}/>{ITEMS.filter((it) => quantity(data, it) > 0).length} Gegenstände</span></div>
    <p className="subline">Tippe einen Gegenstand an, um Herkunft, Seltenheit, Menge und verfügbare Aktionen zu sehen.</p>
    <div className="inventory-filters">{categories.map((name) => <button key={name} className={`room-chip ${filter === name ? 'selected' : ''}`} onClick={() => setFilter(name)}>{name}</button>)}</div>
    {items.length ? <div className="inventory-grid">{items.map((it) => <button key={it.id} className="inventory-card" onClick={() => setSelected(it.id)} data-testid={`inventory-item-${it.id}`}>
      <span className={`item-icon ${it.img ? 'has-img' : ''}`}>{it.img ? <img src={it.img} alt="" loading="lazy"/> : it.icon}</span>
      <strong>{it.name}</strong><small>{category(it)}</small><span className="inventory-quantity">×{quantity(data, it)}</span>
    </button>)}</div> : <div className="empty-state"><Box size={30}/><p>Hier ist noch nichts in dieser Kategorie.</p><button className="button" onClick={() => setFilter('Alle')}>Alle Gegenstände zeigen</button></div>}
    {item && <div className="quest-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="inventory-detail panel" role="dialog" aria-modal="true" aria-labelledby="inventory-detail-name" onClick={(event) => event.stopPropagation()}>
      <button className="button small collection-close" onClick={() => setSelected(null)} aria-label="Schließen"><X size={16}/></button>
      <div className={`inventory-detail-icon ${item.img ? 'has-img' : ''}`}>{item.img ? <img src={item.img} alt={item.name}/> : item.icon}</div>
      <div className="eyebrow">{category(item)}</div><h3 id="inventory-detail-name">{item.name}</h3>
      <span className="rarity-label">{rarity(item)}</span>
      <p>{item.desc || purpose(item)}</p>
      <dl className="inventory-facts"><div><dt>Herkunft</dt><dd>{origin(item)}</dd></div><div><dt>Verwendung</dt><dd>{purpose(item)}</dd></div><div><dt>Im Inventar</dt><dd>×{count}</dd></div></dl>
      <div className="dialog-actions">{actionFor(item)}<button className="button ghost" onClick={() => setSelected(null)}><Check size={15}/> Fertig</button></div>
      {item.type === 'material' && <div className="inventory-readonly"><Sparkles size={15}/> Kein direkter Einsatz. Dieses Material wird in Rezepten verbraucht.</div>}
    </section></div>}
  </section>;
}
