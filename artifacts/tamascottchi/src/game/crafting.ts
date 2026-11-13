import type { FullPetData } from './data';
import { itemById } from './data';
import { recordJournal } from './journal';

export type CraftRecipe = { id: string; name: string; description: string; ingredients: { id: string; quantity: number }[]; result: string };

export const CRAFT_RECIPES: CraftRecipe[] = [
  { id: 'forest-toy', name: 'Wald-Wurfseil', description: 'Ein robustes Zerrspielzeug aus gesammelten Werkstoffen.', ingredients: [{ id: 'wood', quantity: 3 }, { id: 'cloth', quantity: 2 }], result: 'crafted-toy' },
  { id: 'shell-mobile', name: 'Muschel-Mobile', description: 'Leichte Stranddeko fürs Scottchi-Zimmer.', ingredients: [{ id: 'shell', quantity: 5 }, { id: 'rope-fiber', quantity: 1 }], result: 'shell-decor' },
  { id: 'crystal-treat', name: 'Kristall-Leckerli', description: 'Ein besonderer Snack, der Laune und Energie hebt.', ingredients: [{ id: 'crystal-shard', quantity: 2 }, { id: 'gold-fragment', quantity: 1 }], result: 'magic-treat' },
  { id: 'bone-snack', name: 'Knochen-Keks', description: 'Ein kleiner Snack aus Parkfunden.', ingredients: [{ id: 'bone-scrap', quantity: 3 }, { id: 'wood', quantity: 1 }], result: 'magic-treat' },
];

export function craftItem(data: FullPetData, recipeId: string): { data: FullPetData; error?: string } {
  const recipe = CRAFT_RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) return { data, error: 'Dieses Rezept gibt es nicht.' };
  const result = itemById(recipe.result);
  if (!result) return { data, error: 'Das Rezept-Ergebnis fehlt.' };
  if (!result.stackable && data.owned.includes(result.id)) return { data, error: `${result.name} hast du bereits hergestellt.` };
  const missing = recipe.ingredients.find(({ id, quantity }) => (data.inventory[id] || 0) < quantity);
  if (missing) return { data, error: `Es fehlen noch ${missing.quantity - (data.inventory[missing.id] || 0)} ${itemById(missing.id)?.name || missing.id}.` };

  const inventory = { ...data.inventory };
  for (const ingredient of recipe.ingredients) inventory[ingredient.id] -= ingredient.quantity;
  if (result.stackable) inventory[result.id] = (inventory[result.id] || 0) + 1;
  let next: FullPetData = {
    ...data,
    inventory,
    owned: result.stackable ? data.owned : [...new Set([...data.owned, result.id])],
  };
  next = recordJournal(next, `craft-${recipe.id}-${next.inventory[result.id] || next.owned.length}`, '🛠️', `Hergestellt: ${result.name}`, recipe.ingredients.map(({ id, quantity }) => `${quantity}× ${itemById(id)?.name || id}`).join(' · '));
  return { data: next };
}
