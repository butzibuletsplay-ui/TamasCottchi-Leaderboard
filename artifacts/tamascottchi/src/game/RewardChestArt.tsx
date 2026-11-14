import { assetUrl } from './assets';
import type { RewardChestTier } from './data';
import { CHEST_DEFINITIONS } from './rewardChests';

type Props = { tier: RewardChestTier; open?: boolean; className?: string };

export function RewardChestArt({ tier, open = false, className = '' }: Props) {
  const state = open ? 'open' : 'closed';
  return <img
    className={`reward-chest-art ${className}`.trim()}
    src={assetUrl(`rewards/chests/${tier}-${state}.png`)}
    alt={`${CHEST_DEFINITIONS[tier].label}${open ? ' geöffnet' : ''}`}
    loading="lazy"
    decoding="async"
  />;
}
