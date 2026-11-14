import { useState } from 'react';
import { Hammer, LockKeyhole, Sparkles } from 'lucide-react';
import type { FullPetData } from './data';
import { itemById } from './data';
import { CRAFT_RECIPES } from './crafting';
import { hasMaterialArt, MaterialArt } from './MaterialArt';

export function CraftingPage({ data, onCraft }: { data: FullPetData; onCraft: (id: string, quantity: number) => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  return <section className="panel crafting-page" data-testid="crafting-page">
    <div className="panel-head"><div><div className="eyebrow">WELTFUNDE WERDEN ZU AUSRÜSTUNG</div><h2 className="panel-title">Werkstatt</h2></div><Hammer size={19}/></div>
    <p className="subline">Sammle Materialien in Park, Stadt, Wald und am Strand. Herstellen verbraucht die Zutaten sofort.</p>
    <div className="craft-grid">{CRAFT_RECIPES.map((recipe) => {
      const result = itemById(recipe.result)!;
      const quantity = result.stackable ? Math.max(1, Math.min(10, quantities[recipe.id] || 1)) : 1;
      const missing = recipe.ingredients.some(({ id, quantity: required }) => (data.inventory[id] || 0) < required * quantity);
      const alreadyOwned = !result.stackable && data.owned.includes(result.id);
      return <article className="craft-card" key={recipe.id} data-testid={`recipe-${recipe.id}`}>
        <div className="craft-result"><span className={`item-icon ${result.img || hasMaterialArt(result) ? 'has-img' : ''}`}>{hasMaterialArt(result) ? <MaterialArt item={result} size={38}/> : result.img ? <img src={result.img} alt=""/> : result.icon}</span><div><div className="item-title">{result.name}</div><small>{recipe.description}</small></div></div>
        {result.stackable && <label className="craft-quantity">Anzahl
          <input type="number" min={1} max={10} value={quantity} onChange={(event) => {
            const value = Math.max(1, Math.min(10, Number.parseInt(event.target.value || '1', 10) || 1));
            setQuantities((current) => ({ ...current, [recipe.id]: value }));
          }} aria-label={`${result.name}: Anzahl herstellen`} data-testid={`input-craft-quantity-${recipe.id}`}/>
        </label>}
        <div className="craft-ingredients">{recipe.ingredients.map(({ id, quantity: required }) => { const item = itemById(id)!; const have = data.inventory[id] || 0; const total = required * quantity; return <span className={have >= total ? 'enough' : 'short'} key={id}><b>{hasMaterialArt(item) ? <MaterialArt item={item} size={24}/> : item.icon}</b> {item.name} <strong>{have}/{total}</strong></span>; })}</div>
        <button className="button orange" onClick={() => onCraft(recipe.id, quantity)} disabled={missing || alreadyOwned} data-testid={`button-craft-${recipe.id}`}>{alreadyOwned ? <><LockKeyhole size={14}/> Schon hergestellt</> : missing ? 'Material fehlt' : <><Sparkles size={14}/> {quantity > 1 ? `${quantity}× herstellen` : 'Herstellen'}</>}</button>
      </article>;
    })}</div>
  </section>;
}
