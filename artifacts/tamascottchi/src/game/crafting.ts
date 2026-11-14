import type { FullPetData } from './data';
import { itemById } from './data';
import { recordJournal } from './journal';
import { applyWeeklyMetric } from './worldEngine';

export type CraftRecipe = { id: string; name: string; description: string; ingredients: { id: string; quantity: number }[]; result: string };

export const CRAFT_RECIPES: CraftRecipe[] = [
  { id: 'forest-toy', name: 'Wald-Wurfseil', description: 'Ein robustes Zerrspielzeug aus gesammelten Werkstoffen.', ingredients: [{ id: 'wood', quantity: 3 }, { id: 'cloth', quantity: 2 }], result: 'crafted-toy' },
  { id: 'shell-mobile', name: 'Muschel-Mobile', description: 'Leichte Stranddeko fürs Scottchi-Zimmer.', ingredients: [{ id: 'shell', quantity: 5 }, { id: 'rope-fiber', quantity: 1 }], result: 'shell-decor' },
  { id: 'crystal-treat', name: 'Kristall-Leckerli', description: 'Ein besonderer Snack, der Laune und Energie hebt.', ingredients: [{ id: 'crystal-shard', quantity: 2 }, { id: 'gold-fragment', quantity: 1 }], result: 'magic-treat' },
  { id: 'bone-snack', name: 'Knochen-Keks', description: 'Ein kleiner Snack aus Parkfunden.', ingredients: [{ id: 'bone-scrap', quantity: 3 }, { id: 'wood', quantity: 1 }], result: 'magic-treat' },
  { id: 'shell-rattle', name: 'Muschel-Rassel', description: 'Ein sanft klingendes Zerrspielzeug.', ingredients: [{ id: 'shell', quantity: 4 }, { id: 'rope-fiber', quantity: 2 }], result: 'crafted-shell-rattle' },
  { id: 'gem-ball', name: 'Kristall-Ball', description: 'Ein federnder Ball mit schimmerndem Kern.', ingredients: [{ id: 'crystal-shard', quantity: 2 }, { id: 'rope-fiber', quantity: 1 }], result: 'crafted-gem-ball' },
  { id: 'bone-puzzle', name: 'Knochen-Puzzle', description: 'Ein robustes Suchspiel für neugierige Pfoten.', ingredients: [{ id: 'bone-scrap', quantity: 3 }, { id: 'cloth', quantity: 1 }], result: 'crafted-bone-puzzle' },
  { id: 'leaf-frisbee', name: 'Blatt-Frisbee', description: 'Ein leichtes Wurfspielzeug aus gepressten Blättern.', ingredients: [{ id: 'leaf', quantity: 3 }, { id: 'rope-fiber', quantity: 1 }], result: 'crafted-leaf-frisbee' },
  { id: 'fossil-chew', name: 'Fossil-Kauknochen', description: 'Ein seltenes Kauspielzeug mit Fossil-Muster.', ingredients: [{ id: 'fossil', quantity: 1 }, { id: 'bone-scrap', quantity: 3 }], result: 'crafted-fossil-chew' },
  { id: 'berry-bone-cookie', name: 'Beeren-Knochen-Keks', description: 'Ein knuspriger Snack mit frischen Waldbeeren.', ingredients: [{ id: 'berry', quantity: 2 }, { id: 'bone-scrap', quantity: 1 }], result: 'crafted-berry-bone' },
  { id: 'mushroom-biscuit', name: 'Pilz-Keks', description: 'Ein herzhafter Keks aus Waldpilzen.', ingredients: [{ id: 'mushroom', quantity: 2 }, { id: 'wood', quantity: 1 }], result: 'crafted-mushroom-biscuit' },
  { id: 'fish-snack', name: 'Fisch-Snack', description: 'Ein kräftigender Snack aus frischem Fang.', ingredients: [{ id: 'fish-common', quantity: 1 }, { id: 'leaf', quantity: 1 }], result: 'crafted-fish-snack' },
  { id: 'pearl-treat', name: 'Perlen-Leckerli', description: 'Ein seltener Snack für einen glücklichen Scottchi.', ingredients: [{ id: 'fish-rare', quantity: 1 }, { id: 'pearl', quantity: 1 }], result: 'crafted-pearl-treat' },
  { id: 'flower-cookie', name: 'Blüten-Keks', description: 'Ein leichter Keks mit duftenden Blüten.', ingredients: [{ id: 'wildflower', quantity: 2 }, { id: 'berry', quantity: 1 }], result: 'crafted-flower-cookie' },
  { id: 'forest-bed', name: 'Waldnest', description: 'Ein weiches Nest aus Stoff und Blättern.', ingredients: [{ id: 'cloth', quantity: 3 }, { id: 'leaf', quantity: 4 }, { id: 'wood', quantity: 2 }], result: 'crafted-forest-bed' },
  { id: 'crystal-lamp', name: 'Kristall-Laterne', description: 'Eine warme kleine Laterne mit Kristallkern.', ingredients: [{ id: 'crystal-shard', quantity: 3 }, { id: 'gold-fragment', quantity: 1 }], result: 'crafted-crystal-lamp' },
  { id: 'flower-planter', name: 'Blumentopf', description: 'Ein bepflanzter Topf voller Wiesenblumen.', ingredients: [{ id: 'wood', quantity: 2 }, { id: 'wildflower', quantity: 2 }, { id: 'cloth', quantity: 1 }], result: 'crafted-flower-planter' },
  { id: 'driftwood-shelf', name: 'Treibholz-Regal', description: 'Ein kleines Regal aus glatt geschliffenem Treibholz.', ingredients: [{ id: 'driftwood', quantity: 3 }, { id: 'wood', quantity: 2 }], result: 'crafted-driftwood-shelf' },
  { id: 'pearl-mirror', name: 'Perlen-Spiegel', description: 'Ein glänzender Spiegel mit Muschelrand.', ingredients: [{ id: 'pearl', quantity: 3 }, { id: 'shell', quantity: 2 }], result: 'crafted-pearl-mirror' },
  { id: 'mushroom-lamp', name: 'Pilz-Licht', description: 'Ein freundliches Licht aus einer leuchtenden Höhlenkappe.', ingredients: [{ id: 'mushroom', quantity: 3 }, { id: 'crystal-shard', quantity: 1 }, { id: 'wood', quantity: 1 }], result: 'crafted-mushroom-lamp' },
  { id: 'ore-toy', name: 'Erz-Klapper', description: 'Ein robustes Klapperspielzeug aus Berg-Erz.', ingredients: [{ id: 'ore', quantity: 2 }, { id: 'cloth', quantity: 2 }], result: 'crafted-ore-toy' },
  { id: 'fossil-treat', name: 'Fossil-Keks', description: 'Ein knuspriger Keks in Knochenform.', ingredients: [{ id: 'fossil', quantity: 1 }, { id: 'berry', quantity: 2 }], result: 'crafted-fossil-treat' },
  { id: 'berry-juice', name: 'Beeren-Smoothie', description: 'Ein fruchtiger Energieschub für unterwegs.', ingredients: [{ id: 'berry', quantity: 3 }, { id: 'wildflower', quantity: 1 }], result: 'crafted-berry-juice' },
  { id: 'ocean-decor', name: 'Strand-Mobile', description: 'Ein Mobile aus Perlen, Muscheln und Treibholz.', ingredients: [{ id: 'shell', quantity: 3 }, { id: 'pearl', quantity: 1 }, { id: 'driftwood', quantity: 2 }], result: 'crafted-ocean-decor' },
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
  next = applyWeeklyMetric(next, 'craft');
  return { data: next };
}
