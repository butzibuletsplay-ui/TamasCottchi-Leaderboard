import { useState } from 'react';
import { Coins, KeyRound, LockKeyhole, Sparkles, X } from 'lucide-react';
import type { FullPetData, RewardChestTier } from './data';
import { assetUrl } from './assets';
import { ARTIFACTS } from './artifactSystem';
import { CHEST_DEFINITIONS, CHEST_TIERS, type ChestOpenReward } from './rewardChests';
import { RewardChestArt } from './RewardChestArt';
import { CHEST_KEY_PRICES, CHEST_UNLOCK_LEVEL, chestDropChances, chestTierUnlocked, RARITIES } from '@workspace/game-economy';
import { RARITY_LABEL } from './collectionWorld';

type Props = {
  data: FullPetData;
  playerLevel: number;
  economySecured: boolean;
  onBuyKey: (tier: RewardChestTier) => boolean | Promise<boolean>;
  onOpenChest: (tier: RewardChestTier) => ChestOpenReward | null | Promise<ChestOpenReward | null>;
};

export function ChestCollectionPanel({ data, playerLevel, economySecured, onBuyKey, onOpenChest }: Props) {
  const [reveal, setReveal] = useState<ChestOpenReward | null>(null);
  const [opening, setOpening] = useState<RewardChestTier | null>(null);
  const [buying, setBuying] = useState<RewardChestTier | null>(null);

  async function buyKey(tier: RewardChestTier) {
    if (buying) return;
    setBuying(tier);
    try {
      await onBuyKey(tier);
    } finally {
      setBuying(null);
    }
  }

  async function open(tier: RewardChestTier) {
    if (opening) return;
    setOpening(tier);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 380));
      const result = await onOpenChest(tier);
      if (result) setReveal(result);
    } finally {
      setOpening(null);
    }
  }

  return <>
    <section className="chest-collection" data-testid="chest-collection">
      <div className="panel-head">
        <div><div className="eyebrow">SAMMELN · SPÄTER ÖFFNEN</div><h3 className="panel-title">Deine Kisten</h3></div>
        <span className="stat-pill"><KeyRound size={14}/>{CHEST_TIERS.reduce((sum, tier) => sum + (data.world.keys[tier] || 0), 0)} Schlüssel</span>
      </div>
      <p className="subline">Kisten bleiben im Tresor, bis du einen passenden Schlüssel hast. Schlüssel kosten Münzen und werden beim Öffnen verbraucht.</p>
      <p className={`chest-security-note ${economySecured ? 'secure' : ''}`} data-testid="chest-security-status">
        {economySecured ? 'Servergeprüft: Schlüsselkäufe, Schlüsselverbrauch, Ziehungen und das Tageslimit für Weltkisten laufen über den Server.' : 'Lokaler Spielstand: Online-Schutz gilt erst, wenn du diesen Spielstand mit der Cloud verbindest.'}
      </p>
      <div className="chest-collection-grid">
        {CHEST_TIERS.map((tier) => {
          const definition = CHEST_DEFINITIONS[tier];
          const locked = !chestTierUnlocked(tier, playerLevel);
          const count = data.world.rewardChests[tier] || 0;
          const keys = data.world.keys[tier] || 0;
          const chances = chestDropChances(tier, playerLevel);
          const examples = ARTIFACTS.filter((artifact) => chances[artifact.rarity] > 0).slice(0, 2);
          return <article className={`chest-collection-card rarity-${tier} ${locked ? 'locked' : ''}`} key={tier} data-testid={`chest-card-${tier}`}>
            <div className="chest-collection-card-top">
              <RewardChestArt tier={tier} className={opening === tier ? 'chest-opening' : ''}/>
              <div><div className="eyebrow">{locked ? `AB LEVEL ${CHEST_UNLOCK_LEVEL[tier]}` : count === 1 ? '1 KISTE' : `${count} KISTEN`}</div><h4>{definition.label}</h4>
                <span className="chest-key-count"><KeyRound size={13}/>{keys} Schlüssel · {CHEST_KEY_PRICES[tier]} Münzen</span>
              </div>
            </div>
            <div className="chest-drop-preview" aria-label={`Dropchancen ${definition.label}`}>
              {RARITIES.map((rarity) => <div className="chest-drop-row" key={rarity}>
                <span>{RARITY_LABEL[rarity]}</span><div className="chest-drop-track"><i className={`rarity-${rarity.toLowerCase()}`} style={{ width: `${chances[rarity]}%` }}/></div><b>{chances[rarity]}%</b>
              </div>)}
            </div>
            <div className="chest-reward-examples" aria-label="Mögliche Sammlungsfunde">
              {examples.map((artifact) => <span key={artifact.id} title={`${artifact.name} · ${RARITY_LABEL[artifact.rarity]}`}>
                <img src={assetUrl(`collections/items/${artifact.id}.png`)} alt="" loading="lazy"/>
              </span>)}
              <small>mögliche Artefakte nach deinem Weltlevel</small>
            </div>
            <div className="chest-collection-actions">
              <button className="button small" onClick={() => void buyKey(tier)} disabled={locked || buying !== null || data.coins < CHEST_KEY_PRICES[tier]} data-testid={`button-buy-key-${tier}`}>
                <Coins size={13}/>{buying === tier ? 'Kaufe …' : locked ? `Ab Level ${CHEST_UNLOCK_LEVEL[tier]}` : 'Schlüssel kaufen'}
              </button>
              <button className="button orange small" onClick={() => open(tier)} disabled={locked || count < 1 || keys < 1 || opening !== null} data-testid={`button-open-chest-${tier}`}>
                {opening === tier ? <><Sparkles size={13}/> Öffnet …</> : <><LockKeyhole size={13}/> Öffnen</>}
              </button>
            </div>
            {!locked && count > 0 && keys < 1 && <small className="chest-needs-key">Für diese Kiste fehlt noch ein passender Schlüssel.</small>}
          </article>;
        })}
      </div>
    </section>
    {reveal && <div className="quest-backdrop chest-reveal-backdrop" role="presentation" onClick={() => setReveal(null)}>
      <section className={`chest-reveal panel rarity-${reveal.rarity.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="chest-collection-reveal-title" onClick={(event) => event.stopPropagation()} data-testid="chest-reveal">
        <button className="button small collection-close" onClick={() => setReveal(null)} aria-label="Schließen"><X size={16}/></button>
        <div className="chest-reveal-body">
          <RewardChestArt tier={reveal.tier} open className="chest-reveal-art"/>
          <div className="eyebrow">KISTE GEÖFFNET · {RARITY_LABEL[reveal.rarity]}</div>
          <h3 id="chest-collection-reveal-title">{reveal.collectionItem?.name || reveal.itemName}</h3>
          <div className="chest-reward-preview">
            {reveal.collectionItem
              ? <img src={assetUrl(`collections/items/${reveal.collectionItem.id}.png`)} alt="" />
              : <Sparkles size={40}/>}
            <div><strong>{reveal.itemName}{reveal.quantity > 1 && !reveal.collectionItem ? ` ×${reveal.quantity}` : ''}</strong>
              <small>{reveal.isCollectionFind ? 'Neues Artefakt · Stufe 1'
                : reveal.isDuplicate ? `Duplikat · ${reveal.duplicateDust} Artefaktstaub`
                  : 'Belohnung hinzugefügt'}</small>
            </div>
          </div>
          <p className="chest-reveal-bonus">+{reveal.coins} Münzen · +{reveal.xp} XP</p>
          <p className="chest-reveal-source">Fundquelle: {reveal.source}</p>
        </div>
        <div className="chest-reveal-actions"><button className="button orange" onClick={() => setReveal(null)}>Weiter</button></div>
      </section>
    </div>}
  </>;
}
