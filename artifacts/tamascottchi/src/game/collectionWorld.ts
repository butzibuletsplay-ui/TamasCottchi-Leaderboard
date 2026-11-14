import { assetUrl } from './assets';

export type CollectionCategory = 'Hüte' | 'Outfits' | 'Accessoires' | 'Spielzeug' | 'Kristalle' | 'Magische Eier' | 'Trophäen' | 'Besondere Dekorationen';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type CollectionItem = { id: string; name: string; category: CollectionCategory; rarity: Rarity; where: string; condition: string };
export const RARITY_FRAME_ASSETS: Record<Rarity, string> = {
  Common: assetUrl('rewards/frames/common.png'),
  Uncommon: assetUrl('rewards/frames/uncommon.png'),
  Rare: assetUrl('rewards/frames/rare.png'),
  Epic: assetUrl('rewards/frames/epic.png'),
  Legendary: assetUrl('rewards/frames/legendary.png'),
};
export const COLLECTION_ITEM_LINKS: Record<string, string> = {
  'cap-red': 'baseballcap', 'beanie-dark': 'beanie', 'cowboy-star': 'cowboy-hat', 'crown-ruby': 'crown',
  'wizard-purple': 'wizard-hat', 'sleep-cap-blue': 'sleep-cap', 'hoodie-dark': 'hoodie', 'raincoat-gold': 'raincoat',
  tuxedo: 'tuxedo', 'hero-cape-blue': 'cape', 'royal-cape': 'cape', 'royal-armor': 'tuxedo',
  'scarf-red': 'scarf', 'collar-bone': 'collar', 'glasses-dark': 'sunglasses',
  'bone-cream': 'bone-toy', 'tennisball-green': 'ball', duck: 'duck', 'frisbee-red': 'frisbee',
  'rope-red': 'rope', teddy: 'teddy', bowl: 'bowl', 'bottle-pink': 'shampoo', 'flower-pot': 'plant',
};

const rows: [CollectionCategory, string, Rarity, string, string[]][] = [
  ['Hüte','Kopfbedeckungen','Common','Shop und Erkundungsquests',['cap-red','beanie-dark','cowboy-star','chef-hat','party-cone','sleep-cap-blue','ranger-cap']],
  ['Hüte','Kopfbedeckungen','Rare','Spätere Weltgebiete',['crown-ruby','wizard-purple','crown-gold']],
  ['Outfits','Kleidung','Common','Shop und Erkundungsquests',['hoodie-dark','raincoat-gold','varsity-jacket','tuxedo','hero-cape-blue','sweater-cream','shirt-floral','explorer-jacket']],
  ['Outfits','Kleidung','Epic','Questbelohnungen',['royal-cape','royal-armor']],
  ['Accessoires','Hals und Gesicht','Common','Shop und Erkundungsquests',['scarf-red','scarf-blue','scarf-green','scarf-purple','collar-bone','collar-spikes','collar-gem','bandana','harness-blue','wings-gold']],
  ['Accessoires','Hals und Gesicht','Common','Shop und Erkundungsquests',['glasses-dark','monocle','glasses-square','snorkel-goggles','heart-glasses','spiral-glasses','headphones','halo','wings-white','devil-horns']],
  ['Spielzeug','Spielbegleiter','Common','Park, Laden und Erkundung',['bone-cream','tennisball-green','frisbee-red','rope-red','duck','teddy','shark-plush','burger','gamepad','bone-magic']],
  ['Spielzeug','Futter und Pflege','Uncommon','Erkundungsfunde',['bowl','bottle-pink','cheese','brush','mud-pile','paper-roll','leek']],
  ['Kristalle','Schätze','Epic','Spätere Gebiete, noch nicht spielbar',['crystal-rainbow','egg-crystal','egg-lava','gem-flower','portal-orb']],
  ['Besondere Dekorationen','Zimmer und Welt','Uncommon','Erkundungsfunde',['clover','key-gold']],
  ['Magische Eier','Schätze','Rare','Sammelalbum',['egg-common','egg-galaxy','egg-wings']],
  ['Trophäen','Auszeichnungen','Rare','Langfristige Erfolge',['treasure-chest','bell-trophy']],
  ['Trophäen','Auszeichnungen','Legendary','Langfristige Erfolge',['scottchi-statue']],
];

const title = (id: string) => id.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
const cityFinds = new Set(['key-gold','royal-cape','royal-armor','bell-trophy','scottchi-statue','crystal-rainbow','egg-crystal','egg-lava','treasure-chest']);
export const COLLECTION_ITEMS: CollectionItem[] = rows.flatMap(([category, _, rarity, condition, ids]) => ids.map((id) => ({
  id, name: title(id), category, rarity, where: cityFinds.has(id) ? 'Scottchi City · Questbelohnung' : id.startsWith('egg') || id.includes('crystal') ? 'Crystal Cave (noch nicht spielbar)' : id.includes('trophy') ? 'Langfristiger Erfolg' : 'Scottchi World', condition,
})));
export const COLLECTION_CATEGORIES: CollectionCategory[] = ['Hüte','Outfits','Accessoires','Spielzeug','Kristalle','Magische Eier','Trophäen','Besondere Dekorationen'];
export const RARITIES: Rarity[] = ['Common','Uncommon','Rare','Epic','Legendary'];
export const RARITY_LABEL: Record<Rarity,string> = { Common:'Gewöhnlich',Uncommon:'Ungewöhnlich',Rare:'Selten',Epic:'Episch',Legendary:'Legendär' };
export const COLLECTION_REWARDS = [
  { id:'park-set',name:'Park-Fundstücke',items:['bone-cream','frisbee-red','duck'],reward:'Park-Dekoration' },
  { id:'rare-outfits',name:'Seltene Outfits',items:['royal-cape','royal-armor'],reward:'Goldener Rahmen' },
  { id:'crystals',name:'Kristallsammlung',items:['crystal-rainbow','egg-crystal','egg-lava'],reward:'Kristall-Trophäe' },
  { id:'legends',name:'Legendäre Trophäen',items:['scottchi-statue','bell-trophy'],reward:'Goldener Effekt' },
];
