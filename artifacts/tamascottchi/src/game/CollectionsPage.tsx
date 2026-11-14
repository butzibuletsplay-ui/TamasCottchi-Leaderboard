import { useMemo, useState } from 'react';
import { Check, LockKeyhole, Sparkles, X } from 'lucide-react';
import type { FullPetData } from './data';
import { itemById } from './data';
import { assetUrl } from './assets';
import { COLLECTION_ITEMS, COLLECTION_CATEGORIES, COLLECTION_ITEM_LINKS, COLLECTION_REWARDS, RARITIES, RARITY_FRAME_ASSETS, RARITY_LABEL } from './collectionWorld';
import { ARTIFACTS, artifactBonusPercent, artifactUpgradeCost, equippedArtifactBonuses, playerArtifactSlots } from './artifactSystem';

type Props = {
  data: FullPetData;
  playerLevel: number;
  onClaim: (id: string, name: string, coins: number, xp: number) => void;
  onUpgradeArtifact: (id: string) => void;
  onToggleArtifact: (id: string) => void;
};

export function CollectionsPage({ data, playerLevel, onClaim, onUpgradeArtifact, onToggleArtifact }: Props) {
  const [category, setCategory] = useState('Alle');
  const [rarity, setRarity] = useState('Alle');
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const owned = new Set([...(data.collectionIds || []), ...data.world.discoveries]);
  const hasItem = (id: string) => owned.has(id) || (!!COLLECTION_ITEM_LINKS[id] && data.owned.includes(COLLECTION_ITEM_LINKS[id]));
  const list = useMemo(() => COLLECTION_ITEMS.filter((item) =>
    (category === 'Alle' || item.category === category) && (rarity === 'Alle' || item.rarity === rarity),
  ), [category, rarity]);
  const found = COLLECTION_ITEMS.filter((item) => hasItem(item.id)).length;
  const item = COLLECTION_ITEMS.find((entry) => entry.id === selected);
  const linkedId = item ? COLLECTION_ITEM_LINKS[item.id] : undefined;
  const linkedItem = linkedId ? itemById(linkedId) : undefined;
  const linkedCount = linkedItem ? ((data.inventory[linkedId!] || 0) || (data.owned.includes(linkedId!) ? 1 : 0)) : 0;
  const artifact = ARTIFACTS.find((entry) => entry.id === selectedArtifact);
  const artifactLevel = selectedArtifact ? data.artifactLevels[selectedArtifact] || 0 : 0;
  const upgradeCost = artifact && artifactLevel > 0 ? artifactUpgradeCost(artifact, artifactLevel) : null;
  const canAfford = !!upgradeCost && data.coins >= upgradeCost.coins &&
    Object.entries(upgradeCost.materials).every(([id, amount]) => (data.inventory[id] || 0) >= amount);
  const slotCount = playerArtifactSlots(playerLevel);
  const bonuses = equippedArtifactBonuses(data);
  const equipped = new Set(data.equippedArtifacts);

  return <section className="panel collections-page" data-testid="collections-page">
    <div className="panel-head">
      <div><div className="eyebrow">SAMMELN · ENTDECKEN · VERBESSERN</div><h2 className="panel-title">Scottchi Collections</h2></div>
      <span className="stat-pill"><Sparkles size={14}/>{found}/{COLLECTION_ITEMS.length}</span>
    </div>
    <div className="collection-progress"><i style={{ width: `${found / COLLECTION_ITEMS.length * 100}%` }}/></div>
    <p className="subline">{Math.round(found / COLLECTION_ITEMS.length * 100)} % entdeckt · {found} von {COLLECTION_ITEMS.length} Artefakten</p>

    <section className="artifact-workshop" aria-label="Artefakt-Werkstatt" data-testid="artifact-workshop">
      <div className="panel-head">
        <div><div className="eyebrow">AUSRÜSTEN · AUFWERTEN</div><h3 className="panel-title">Artefakt-Werkstatt</h3></div>
        <span className="stat-pill">{data.equippedArtifacts.length}/{slotCount} Plätze</span>
      </div>
      <p className="subline">Nur ausgerüstete Artefakte wirken. Zusätzliche Plätze gibt es auf Spielerlevel 10 und 20.</p>
      <div className="artifact-loadout" data-testid="artifact-loadout">
        {Array.from({ length: slotCount }, (_, index) => {
          const current = data.equippedArtifacts[index];
          const equippedArtifact = ARTIFACTS.find((entry) => entry.id === current);
          return <button key={index} type="button" className={`artifact-slot ${equippedArtifact ? `rarity-${equippedArtifact.rarity.toLowerCase()}` : 'empty'}`}
            onClick={() => equippedArtifact && setSelectedArtifact(equippedArtifact.id)}
            aria-label={equippedArtifact ? `Ausrüstungsplatz ${index + 1}: ${equippedArtifact.name}` : `Leerer Ausrüstungsplatz ${index + 1}`}>
            {equippedArtifact ? <img src={assetUrl(`collections/items/${equippedArtifact.id}.png`)} alt=""/> : <span>＋</span>}
            <small>{equippedArtifact?.name || `Platz ${index + 1}`}</small>
          </button>;
        })}
      </div>
      <div className="artifact-bonus-strip" aria-label="Aktive Artefaktboni">
        <span>Aktive Boni</span>
        <b>Coins +{bonuses.coins}%</b><b>XP +{bonuses.xp}%</b><b>Material +{bonuses.materials}%</b>
      </div>
      {data.equippedArtifacts.length > 0 && <p className="artifact-effect-summary">
        {data.equippedArtifacts.map((id) => {
          const active = ARTIFACTS.find((entry) => entry.id === id);
          return active ? `${active.name}: +${artifactBonusPercent(active, data.artifactLevels[id])}% ${active.effect.label}` : '';
        }).filter(Boolean).join(' · ')}
      </p>}
      {ARTIFACTS.some((entry) => data.artifactLevels[entry.id]) ? <div className="artifact-grid">
        {ARTIFACTS.filter((entry) => data.artifactLevels[entry.id]).map((entry) => {
          const level = data.artifactLevels[entry.id];
          return <button key={entry.id} type="button" className={`artifact-card rarity-${entry.rarity.toLowerCase()} ${equipped.has(entry.id) ? 'equipped' : ''}`}
            onClick={() => setSelectedArtifact(entry.id)} data-testid={`artifact-card-${entry.id}`}>
            <span className="artifact-card-art"><img src={assetUrl(`collections/items/${entry.id}.png`)} alt="" loading="lazy"/></span>
            <span className="artifact-card-copy"><b>{entry.name}</b><small>{RARITY_LABEL[entry.rarity]} · Stufe {level}/20</small><small>+{artifactBonusPercent(entry, level)}% {entry.effect.label}</small></span>
            {equipped.has(entry.id) && <span className="artifact-equipped-badge"><Check size={12}/> Aktiv</span>}
          </button>;
        })}
      </div> : <div className="empty-state artifact-empty"><Sparkles size={24}/><p>Deine ersten Artefakte erscheinen hier. Entdecke sie in der Welt und in Belohnungskisten.</p></div>}
    </section>

    <section className="collection-reward-grid" aria-label="Sammlungsbelohnungen">
      {COLLECTION_REWARDS.map((reward) => {
        const complete = reward.items.every(hasItem);
        const claimed = data.world.claimedRewards.includes(reward.id);
        return <div className={`collection-reward ${complete ? 'earned' : ''}`} key={reward.id}>
          <Sparkles size={15}/><span><b>{reward.name}</b><small>{reward.reward} · {claimed ? 'Abgeholt' : complete ? 'Bereit' : 'Noch offen'}</small></span>
          {complete && !claimed && <button className="button small" onClick={() => onClaim(reward.id, reward.name, 40, 25)}>Abholen</button>}
          {claimed && <Check size={16}/>}
        </div>;
      })}
    </section>

    <div className="collection-filters">
      <label>Kategorie<select value={category} onChange={(event) => setCategory(event.target.value)} data-testid="collection-category"><option>Alle</option>{COLLECTION_CATEGORIES.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
      <label>Seltenheit<select value={rarity} onChange={(event) => setRarity(event.target.value)} data-testid="collection-rarity"><option>Alle</option>{RARITIES.map((entry) => <option key={entry} value={entry}>{RARITY_LABEL[entry]}</option>)}</select></label>
    </div>
    <div className="collection-grid" data-testid="collection-grid">
      {list.map((entry) => {
        const has = hasItem(entry.id);
        return <button key={entry.id} className={`collection-card rarity-${entry.rarity.toLowerCase()} ${has ? 'found' : 'unknown'}`}
          onClick={() => setSelected(entry.id)} data-testid={`collection-item-${entry.id}`}
          aria-label={has ? entry.name : 'Unentdecktes Sammelstück'}>
          <span className="collection-sprite">
            <img className="collection-rarity-frame" src={RARITY_FRAME_ASSETS[entry.rarity]} alt="" aria-hidden="true" loading="lazy" decoding="async"/>
            <img className="collection-item-art" src={assetUrl(`collections/items/${entry.id}.png`)} alt="" loading="lazy" decoding="async"/>
          </span>
          <strong>{has ? entry.name : '???'}</strong><small>{RARITY_LABEL[entry.rarity]}</small>
          {has ? <Check className="collection-check" size={13}/> : <LockKeyhole className="collection-check" size={13}/>}
        </button>;
      })}
    </div>

    {item && <div className="quest-backdrop" role="presentation" onClick={() => setSelected(null)}>
      <section className={`collection-detail panel rarity-${item.rarity.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="collection-detail-title" onClick={(event) => event.stopPropagation()}>
        <button className="button small collection-close collection-detail-close" onClick={() => setSelected(null)} aria-label="Schließen"><X size={16}/></button>
        <div className="collection-detail-preview">
          <img className="collection-rarity-frame" src={RARITY_FRAME_ASSETS[item.rarity]} alt="" aria-hidden="true"/>
          <img className="collection-item-art" src={assetUrl(`collections/items/${item.id}.png`)} alt={item.name}/>
        </div>
        <div className="eyebrow">{item.category}</div><h3 id="collection-detail-title">{hasItem(item.id) ? item.name : 'Unbekannter Fund'}</h3>
        <span className={`rarity-label rarity-${item.rarity.toLowerCase()}`}>{RARITY_LABEL[item.rarity]}</span>
        <p>{item.name} ist ein einzigartiges Artefakt aus der Scottchi-Welt.</p>
        <p><b>Fundort:</b> {item.where}<br/><b>Freischaltung:</b> {item.condition}<br/><b>Albumstatus:</b> {hasItem(item.id) ? 'Entdeckt · einmal im Album' : 'Noch nicht gefunden'}</p>
        {hasItem(item.id) && <div className="dialog-actions">
          <button className="button orange" onClick={() => { setSelected(null); setSelectedArtifact(item.id); }}>In der Werkstatt ansehen</button>
          {linkedItem && <span className="inventory-readonly">Inventar: {linkedCount ? `×${linkedCount} ${linkedItem.name}` : `Kein ${linkedItem.name} im Besitz`}</span>}
        </div>}
      </section>
    </div>}

    {artifact && <div className="quest-backdrop artifact-detail-backdrop" role="presentation" onClick={() => setSelectedArtifact(null)}>
      <section className={`artifact-detail panel rarity-${artifact.rarity.toLowerCase()}`} role="dialog" aria-modal="true" aria-labelledby="artifact-detail-title" onClick={(event) => event.stopPropagation()} data-testid="artifact-detail">
        <button className="button small collection-close" onClick={() => setSelectedArtifact(null)} aria-label="Schließen"><X size={16}/></button>
        <div className="artifact-detail-body">
          <div className={`artifact-detail-art rarity-${artifact.rarity.toLowerCase()} ${artifactLevel >= 20 ? 'milestone-20' : artifactLevel >= 15 ? 'milestone-15' : artifactLevel >= 10 ? 'milestone-10' : artifactLevel >= 5 ? 'milestone-5' : ''}`}>
            <img src={assetUrl(`collections/items/${artifact.id}.png`)} alt={artifact.name}/>
            {artifactLevel >= 20 && <span className="artifact-max-crown">✦ MAX ✦</span>}
          </div>
          <div className="eyebrow">{artifact.category} · {artifact.where}</div>
          <h3 id="artifact-detail-title">{artifact.name}</h3>
          <span className={`rarity-label rarity-${artifact.rarity.toLowerCase()}`}>{RARITY_LABEL[artifact.rarity]}</span>
          <p>{artifact.description}</p>
          <div className="artifact-level-heading"><b>Stufe {artifactLevel} / 20</b><span>{artifactLevel >= 20 ? 'Maximalstufe' : `${artifactLevel} von 20`}</span></div>
          <div className="artifact-level-bar"><i style={{ width: `${artifactLevel / 20 * 100}%` }}/></div>
          <div className="artifact-effect-card"><small>{artifact.activation === 'passive' ? 'PASSIVER BONUS' : 'AKTIVER EFFEKT'}</small><b>+{artifactBonusPercent(artifact, artifactLevel)}% {artifact.effect.label}</b><small>{equipped.has(artifact.id) ? 'Aktiv ausgerüstet' : 'Wird erst nach dem Ausrüsten aktiv'}</small></div>
          {upgradeCost && <div className="artifact-upgrade-preview">
            <div><small>NÄCHSTE STUFE</small><b>Stufe {artifactLevel + 1} · +{artifactBonusPercent(artifact, artifactLevel + 1)}%</b></div>
            <div><small>KOSTEN</small><b>{upgradeCost.coins.toLocaleString('de-DE')} Münzen</b></div>
            <div><small>MATERIALIEN</small><b>{Object.entries(upgradeCost.materials).map(([id, amount]) => `${amount}× ${itemById(id)?.name || id} (${data.inventory[id] || 0})`).join(' · ')}</b></div>
          </div>}
          {!upgradeCost && <div className="artifact-effect-card artifact-max-note"><b>Maximallevel erreicht</b><small>Einzigartige Darstellung und voller Artefaktbonus freigeschaltet.</small></div>}
        </div>
        <div className="artifact-detail-actions">
          <button className="button orange" onClick={() => onUpgradeArtifact(artifact.id)} disabled={!upgradeCost || !canAfford} data-testid="button-upgrade-artifact">
            {upgradeCost ? canAfford ? 'Artefakt aufwerten' : 'Materialien fehlen' : 'Maximallevel'}
          </button>
          <button className="button" onClick={() => onToggleArtifact(artifact.id)} data-testid="button-toggle-artifact">
            {equipped.has(artifact.id) ? 'Ablegen' : data.equippedArtifacts.length >= slotCount ? 'Kein Platz frei' : 'Ausrüsten'}
          </button>
        </div>
      </section>
    </div>}
  </section>;
}
