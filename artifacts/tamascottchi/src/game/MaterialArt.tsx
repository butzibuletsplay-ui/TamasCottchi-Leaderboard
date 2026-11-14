import type { Item } from './data';
import { itemAsset } from './assets';

const outline = '#573722';

export function MaterialArt({ item, size = 42 }: { item: Pick<Item, 'id' | 'name' | 'type'>; size?: number }) {
  const sprite = itemAsset(item.id);
  if (sprite) return <img className="material-art material-art-sprite" src={sprite} width={size} height={size} alt={item.name} loading="lazy"/>;

  const shape = (() => {
    switch (item.id) {
      case 'crafted-crystal-lamp': return <g><path d="M26 13h16l8 23H18Z" fill="#f3cb78"/><path d="M34 8 44 25l-10 11-10-11Z" fill="#81c7d1"/><path d="M20 37h28v5H20Zm7 5h14v8H27Z" fill="#9b6237"/></g>;
      case 'crafted-pearl-mirror': return <g><circle cx="34" cy="27" r="20" fill="#dda85d"/><circle cx="34" cy="27" r="14" fill="#a9ced1"/><path d="M28 49h12m-6-2v-9" fill="none" stroke="#815232" strokeWidth="4"/><circle cx="34" cy="7" r="2" fill="#fff0c5"/><circle cx="54" cy="27" r="2" fill="#fff0c5"/><circle cx="14" cy="27" r="2" fill="#fff0c5"/></g>;
      case 'crafted-mushroom-lamp': return <g><path d="M29 29q0 13-6 17h23q-6-4-6-17Z" fill="#f3d9ab"/><path d="M14 29q0-20 20-20t20 20q-20 10-40 0Z" fill="#d67955"/><path d="M22 47h24" stroke="#9a6840" strokeWidth="4"/></g>;
      case 'crafted-ocean-decor': return <g><path d="M34 9v16m-19 1h38M22 26v17m12-17v24m12-24v16" fill="none" stroke="#8c603e" strokeWidth="3"/><circle cx="22" cy="47" r="6" fill="#e7a788"/><circle cx="34" cy="53" r="6" fill="#ecd9bb"/><circle cx="46" cy="46" r="6" fill="#80bbc3"/></g>;
      case 'crafted-shell-decor': return <g><path d="M34 8v40m-20-23h40M20 27v17m14-17v22m14-22v17" fill="none" stroke="#8c603e" strokeWidth="3"/><circle cx="20" cy="47" r="6" fill="#e7a788"/><circle cx="34" cy="53" r="6" fill="#ecd9bb"/><circle cx="48" cy="47" r="6" fill="#e7a788"/></g>;
      case 'crafted-ore-toy': return <g><path d="M13 28 26 11h19l11 17-8 20H20Z" fill="#a1a9a0"/><path d="m26 11 8 18 11-18M13 28l21 1 14 19m-14-19 11-2" fill="none" stroke="#627d78"/><circle cx="34" cy="29" r="4" fill="#f2ce69"/></g>;
      case 'crafted-flower-planter': return <g><path d="M31 29Q12 16 22 8q11-2 13 16Q38 5 48 9q8 9-10 20" fill="#79a058"/><path d="M22 28h25l-4 25H26Z" fill="#c47b54"/><path d="M20 29h29" stroke="#854d35" strokeWidth="4"/><circle cx="43" cy="13" r="6" fill="#eccb68"/><circle cx="43" cy="13" r="2" fill="#8e583b"/></g>;
      case 'crafted-driftwood-shelf': return <g><path d="m13 24 42-5 2 7-42 5Zm0 19 42-5 2 7-42 5Z" fill="#ae7444"/><path d="M20 29v14m28-17v14M17 48v5m34-7v5" fill="none" stroke="#70482e" strokeWidth="3"/><path d="m20 23 24-2m-24 21 24-3" stroke="#e1b67c" strokeWidth="2"/></g>;
      case 'crafted-forest-bed': return <g><path d="M11 29q3-11 15-10h22q10 1 11 10v18H11Z" fill="#c88e56"/><path d="M15 27q4-7 12-5l6 5v9H15Zm18 3h21v12H33Z" fill="#f4d9a9"/><path d="M11 45h48m-43 0v7m38-7v7" fill="none" stroke="#6d452b" strokeWidth="3"/></g>;
      case 'crafted-flower-cookie': return <g><circle cx="34" cy="31" r="19" fill="#edc578"/><circle cx="34" cy="31" r="9" fill="#b7794d"/><circle cx="34" cy="13" r="4" fill="#f9e9b7"/><circle cx="50" cy="21" r="4" fill="#f9e9b7"/><circle cx="52" cy="39" r="4" fill="#f9e9b7"/><circle cx="34" cy="49" r="4" fill="#f9e9b7"/><circle cx="18" cy="39" r="4" fill="#f9e9b7"/><circle cx="18" cy="21" r="4" fill="#f9e9b7"/></g>;
      case 'crafted-berry-juice': return <g><path d="M24 13h20l-2 7q7 5 7 12v19H19V32q0-7 7-12Z" fill="#d77b73"/><path d="M27 13h14l-2 10H25Z" fill="#f1d6ae"/><path d="M25 33h18m-16 7h14" stroke="#f6ded0" strokeWidth="3"/><circle cx="40" cy="27" r="3" fill="#cf454c"/></g>;
      case 'crafted-fish-snack': return <g><path d="M11 29q19-22 39 0-20 22-39 0Z" fill="#75a8b8"/><path d="m47 29 11-10v20Z" fill="#e4ad62"/><circle cx="22" cy="26" r="2.5" fill={outline}/><path d="m27 18 7 11-7 10m8-18 7 8-7 9" fill="none" stroke="#d8eef0" strokeWidth="2"/></g>;
      case 'crafted-berry-bone': case 'crafted-mushroom-biscuit': case 'crafted-pearl-treat': case 'crafted-fossil-treat': case 'magic-treat': return <g><path d="M18 17q15-9 30 0l-3 28q-13 9-26 0Z" fill="#e5ad59"/><path d="M20 22q13-7 26 0M21 39q12 8 24 0" fill="none" stroke="#9c6533" strokeWidth="2"/><path d="M27 29h2m8 0h2" stroke="#fff4d6" strokeWidth="4" strokeLinecap="round"/></g>;
      case 'wood': return <g><path d="M14 28 22 12q2-4 6-2l29 15-8 17-31-11q-7-2-4-3Z" fill="#b9783e"/><path d="M22 12q3-4 7-2l5 3-8 17-13-2q-2-1 1-5Z" fill="#e7ad65"/><ellipse cx="22" cy="23" rx="4" ry="7" fill="#d18c4a" transform="rotate(24 22 23)"/><path d="M19 23q3-5 6-1t-1 7" fill="none"/></g>;
      case 'cloth': return <g><path d="m13 18 14-7 8 5 13-4 9 8-7 29-31 2-8-14Z" fill="#8eabc8"/><path d="m27 11 8 5-8 8-8-6m16-2 9 10-9 7m9-7 8-4 5 5-5 7" fill="none"/><path d="m19 37 24 7" fill="none" stroke="#d9e2eb"/></g>;
      case 'bone-scrap': case 'fossil': case 'crafted-bone-puzzle': case 'crafted-fossil-chew': return <g><path d="M18 20a7 7 0 1 1 6-10l16 18a7 7 0 1 1-7 8L18 20Z" fill={item.id === 'fossil' || item.id === 'crafted-fossil-chew' ? '#d8bf9b' : '#f0dfbd'}/><path d="m24 19 13 14" fill="none" stroke="#ba9970"/></g>;
      case 'crystal-shard': case 'ore': case 'crafted-gem-ball': return <g><path d="m33 7 19 17-8 25-23-2-7-18Z" fill="#62a8bd"/><path d="m33 7 1 26 18-9M33 33l-12 14m13-14 10 16M33 7 21 29l13 4" fill="#b5e4dd" stroke="#effff7"/><path d="m33 7 19 17-8 25-23-2-7-18Z" fill="none"/></g>;
      case 'gold-fragment': case 'old-coin': return <g><circle cx="34" cy="31" r="20" fill="#e4aa3c"/><circle cx="34" cy="31" r="14" fill="#f7d276"/><path d="M34 20v22m-6-16c2-3 10-3 12 0s-1 5-6 6-8 4-5 7 9 3 12 0" fill="none" stroke="#9d6428" strokeWidth="2.5"/></g>;
      case 'shell': case 'pearl': case 'crafted-shell-rattle': return <g><path d="M13 39q-2-25 18-28 24-2 26 28-22 13-44 0Z" fill={item.id === 'pearl' ? '#f3e4c9' : '#e6a786'}/><path d="M16 38q7-18 15-27m-9 30q5-20 9-30m0 31V11m6 29q-2-19-6-29m12 27q-4-18-12-27" fill="none" stroke="#bd765f" strokeWidth="2"/></g>;
      case 'rope-fiber': return <g><path d="M15 15q25 0 12 17t15 18q13-1 7-14-4-8-16-7" fill="none" stroke="#b9783e" strokeWidth="9" strokeLinecap="round"/><path d="M15 15q25 0 12 17t15 18q13-1 7-14-4-8-16-7" fill="none" stroke="#e9c078" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round"/></g>;
      case 'leaf': case 'wildflower': case 'berry': return <g><path d="M31 48Q7 28 23 12q24-2 23 20-2 12-15 16Z" fill={item.id === 'berry' ? '#b74b47' : item.id === 'wildflower' ? '#e7a0b1' : '#7b9e56'}/><path d="M16 43q12-14 27-28M31 35l-1-12m5 6 8 1" fill="none" stroke={item.id === 'berry' ? '#702e2b' : '#4a653b'} strokeWidth="2.5"/>{item.id === 'wildflower' && <g fill="#f8d46a"><circle cx="48" cy="16" r="7"/><circle cx="54" cy="22" r="7"/><circle cx="48" cy="28" r="7"/><circle cx="42" cy="22" r="7"/><circle cx="48" cy="22" r="3" fill="#9a5939"/></g>}</g>;
      case 'mushroom': return <g><path d="M27 29q0 19-6 20h27q-7-3-7-20Z" fill="#f2d8ad"/><path d="M12 29q1-21 21-22 20 1 22 22-20 9-43 0Z" fill="#c9694b"/><circle cx="25" cy="19" r="3" fill="#ffe5bf"/><circle cx="40" cy="14" r="3" fill="#ffe5bf"/><circle cx="45" cy="25" r="2.5" fill="#ffe5bf"/></g>;
      case 'driftwood': return <g><path d="m13 42 13-17 27 7-12 17Zm8-24 9-8 21 8-9 11Z" fill="#ae7444"/><path d="m13 42 13-17 27 7-12 17m-20-24 9-8 21 8-9 11" fill="none"/><path d="m21 18 21 8m-16-1 22 7" fill="none" stroke="#e1b67c"/></g>;
      case 'fish-common': case 'fish-rare': return <g><path d="M11 29q19-22 39 0-20 22-39 0Z" fill={item.id === 'fish-rare' ? '#8d82bc' : '#75a8b8'}/><path d="m47 29 11-10v20Z" fill="#e4ad62"/><circle cx="22" cy="26" r="2.5" fill={outline}/><path d="m27 18 7 11-7 10m8-18 7 8-7 9" fill="none" stroke="#d8eef0" strokeWidth="2"/></g>;
      case 'shell-decor': return <g><path d="M34 8v40m-20-23h40M20 27v17m14-17v22m14-22v17" fill="none" stroke="#8c603e" strokeWidth="3"/><circle cx="20" cy="47" r="6" fill="#e7a788"/><circle cx="34" cy="53" r="6" fill="#ecd9bb"/><circle cx="48" cy="47" r="6" fill="#e7a788"/></g>;
      default: return <g><circle cx="34" cy="31" r="21" fill="#d6a665"/><path d="M20 32q14-20 28 0-14 21-28 0Z" fill="#f0d8ab"/><circle cx="34" cy="31" r="4" fill="#9d6540"/></g>;
    }
  })();

  return <svg className="material-art" width={size} height={size} viewBox="0 0 68 62" role="img" aria-label={item.name}>
    <g stroke={outline} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">{shape}</g>
  </svg>;
}

export function hasMaterialArt(item: Pick<Item, 'type' | 'craftOnly'>): boolean {
  return item.type === 'material' || Boolean(item.craftOnly);
}
