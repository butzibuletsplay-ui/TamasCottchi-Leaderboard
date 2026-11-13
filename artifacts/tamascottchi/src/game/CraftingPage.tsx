import { Hammer, LockKeyhole, Sparkles } from 'lucide-react';
import type { FullPetData } from './data';
import { itemById } from './data';
import { CRAFT_RECIPES } from './crafting';

export function CraftingPage({ data, onCraft }: { data: FullPetData; onCraft: (id: string) => void }) {
  return <section className="panel crafting-page" data-testid="crafting-page">
    <div className="panel-head"><div><div className="eyebrow">WELTFUNDE WERDEN ZU AUSRÜSTUNG</div><h2 className="panel-title">Werkstatt</h2></div><Hammer size={19}/></div>
    <p className="subline">Sammle Materialien in Park, Stadt, Wald und am Strand. Herstellen verbraucht die Zutaten sofort.</p>
    <div className="craft-grid">{CRAFT_RECIPES.map((recipe) => {
      const result = itemById(recipe.result)!;
      const missing = recipe.ingredients.some(({ id, quantity }) => (data.inventory[id] || 0) < quantity);
      const alreadyOwned = !result.stackable && data.owned.includes(result.id);
      return <article className="craft-card" key={recipe.id} data-testid={`recipe-${recipe.id}`}>
        <div className="craft-result"><span className="item-icon">{result.img ? <img src={result.img} alt=""/> : result.icon}</span><div><div className="item-title">{result.name}</div><small>{recipe.description}</small></div></div>
        <div className="craft-ingredients">{recipe.ingredients.map(({ id, quantity }) => { const item = itemById(id)!; const have = data.inventory[id] || 0; return <span className={have >= quantity ? 'enough' : 'short'} key={id}><b>{item.icon}</b> {item.name} <strong>{have}/{quantity}</strong></span>; })}</div>
        <button className="button orange" onClick={() => onCraft(recipe.id)} disabled={missing || alreadyOwned} data-testid={`button-craft-${recipe.id}`}>{alreadyOwned ? <><LockKeyhole size={14}/> Schon hergestellt</> : missing ? 'Material fehlt' : <><Sparkles size={14}/> Herstellen</>}</button>
      </article>;
    })}</div>
  </section>;
}
