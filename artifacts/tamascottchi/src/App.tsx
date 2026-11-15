import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, Award, Backpack, Bath, BookOpen, Check, CircleHelp, Coins, Download, Dumbbell, Gamepad2, Gift, Hammer, Heart, Home, House, KeyRound,
  Medal, Moon, Play, Plus, Settings, Shirt, ShoppingBag, Sparkles, Star, Target, Trophy,
  Utensils, Volume2, VolumeX, X, Sun, Sunset, Library, Shirt as ShirtIcon, Compass, Users,
} from 'lucide-react';
import { BACKGROUNDS, CORE_SPRITES, preloadAll, preloadImage } from './game/assets';
import type { GameId, GameResult, SoundFn } from './game/engine';
import { GameStage, type RewardSummary } from './game/GameStage';
import { SLOT_OF, Scottchi } from './game/Scottchi';
import { OutfitLab } from './game/OutfitLab';
import { World } from './game/World';
import { CollectionsPage } from './game/CollectionsPage';
import { EvolutionPage } from './game/EvolutionPage';
import { EVOLUTION_STAGES, selectUnlockedEvolution, type EvolutionPurchaseResult } from './game/evolution';
import { AimLayer, FlyingToy, type Point, type Throw } from './game/ToyPlay';
import {
  FAVORITE_TOY, FOOD_LINES, IDLE_CLASS, IDLE_LINES, PHASE_INFO, SURPRISES, TOY_LINES, TRAITS, dayPhase, dominant, hasCharacter, nudge,
  type Trait,
} from './game/personality';
import {
  CHALLENGES, COLLECTIONS, GAMES, ITEMS, PLAYER_LEVEL_MILESTONES, ROOM_BG, ROOM_LIST, STORE_KEY, STYLE_SETS, SaveLoadError, assertSave, clamp, initialData, itemById, levelFor, loadData,
  moodFor, normalize, today, type DailyProgress, type FullPetData, type GameRecord, type Item, type NeedKey, type RewardChestTier, type Room,
} from './game/data';
import { craftItem } from './game/crafting';
import { CraftingPage } from './game/CraftingPage';
import { HelpPage } from './game/HelpPage';
import { InventoryPage } from './game/InventoryPage';
import { consumeToyStock, TOY_USE, type PetAction } from './game/toyRules';
import { JournalPage } from './game/JournalPage';
import { recordJournal } from './game/journal';
import { completeQuestAction } from './game/questEngine';
import { releasePendingWorldDiscoveries } from './game/worldDiscoveries';
import { hasMaterialArt, MaterialArt } from './game/MaterialArt';
import {
  getGetOnlineProfileQueryKey, getGetOnlineSaveQueryKey, useClaimOnlineDailyWorldChest, useGetOnlineProfile, useGetOnlineSave,
  useClaimOnlineMinigameDailyChest, useCompleteOnlineMinigameRound, useEarnOnlineCharacterPoints, useOpenOnlineRewardChest,
  usePurchaseOnlineChestKey, usePurchaseOnlineEvolution, useUpdateOnlineSave,
} from '@workspace/api-client-react';
import { OnlinePage } from './game/OnlinePage';
import { buyChestKey, CHEST_DEFINITIONS, CHEST_TIERS, openRewardChest } from './game/rewardChests';
import type { ChestOpenReward } from './game/rewardChests';
import {
  applicableArtifactBonus, applyArtifactBonus, ARTIFACTS, equipArtifact, grantChest, grantRegularChest, unlockArtifact,
  grantMilestoneChest, MINIGAME_SCORE_CHEST_MILESTONES, upgradeArtifact,
} from './game/artifactSystem';
import { COLLECTION_ITEM_LINKS } from './game/collectionWorld';
import {
  CHEST_UNLOCK_LEVEL, MAX_PLAYER_XP, MINIGAME_DAILY_TASK_TARGET, MINIGAME_DAILY_XP_CAP, applyMinigameRound,
  chestKeyPrice, claimMinigameDailyChest, minigameDailyChestChances, minigameDailyCoinCap,
  CHARACTER_DAILY_POINT_CAP, CHARACTER_TOY_TRAITS, CHARACTER_TRAIT_IDS, normalizeCharacterDailyProgress,
  simulatePetNeeds, type CharacterActivityId, type CharacterToyId,
  normalizeMinigameDailyState, playerLevelProgress,
} from '@workspace/game-economy';
type PetData = FullPetData;

type CloudLink = { userId: string; revision: number; fingerprint: string };
type CloudSyncStatus = 'offline' | 'checking' | 'unlinked' | 'syncing' | 'synced' | 'conflict' | 'error';
const NEEDS: { id: NeedKey | 'zuneigung'; name: string; icon: typeof Heart }[] = [
  { id: 'hunger', name: 'Sattheit', icon: Utensils }, { id: 'glueck', name: 'Laune', icon: Heart },
  { id: 'energie', name: 'Energie', icon: Activity }, { id: 'sauberkeit', name: 'Sauberkeit', icon: Sparkles },
  { id: 'zuneigung', name: 'Zuneigung', icon: Users },
];
const DAILY_GOALS: { id: keyof DailyProgress; title: string; detail: string; target: number; rewardCoins: number; rewardXp: number }[] = [
  { id: 'feeds', title: 'Snack-Zeit', detail: 'Füttere Scottchi dreimal', target: 3, rewardCoins: 8, rewardXp: 10 },
  { id: 'games', title: 'Spielrunde', detail: 'Spiele drei Minispiele', target: 3, rewardCoins: 15, rewardXp: 15 },
  { id: 'baths', title: 'Schaumparty', detail: 'Bade Scottchi zweimal', target: 2, rewardCoins: 10, rewardXp: 12 },
  { id: 'pets', title: 'Kraul-Meister', detail: 'Streichle Scottchi fünfmal', target: 5, rewardCoins: 10, rewardXp: 12 },
  { id: 'coins', title: 'Münz-Magnet', detail: 'Verdiene 100 Münzen', target: 100, rewardCoins: 12, rewardXp: 12 },
];
function advanceDaily(data: PetData, id: keyof DailyProgress, amount = 1): PetData {
  let next: PetData = { ...data, daily: { ...data.daily, [id]: data.daily[id] + amount }, missions: { ...data.missions } };
  for (const goal of DAILY_GOALS) {
    if (next.daily[goal.id] >= goal.target && !next.missions[goal.id]) {
      next = { ...next, coins: next.coins + goal.rewardCoins, xp: next.xp + goal.rewardXp, missions: { ...next.missions, [goal.id]: true } };
    }
  }
  return next;
}

function saveFingerprint(data: PetData): string {
  const serialized = JSON.stringify(data);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function applyNeeds(needs: PetData['needs'], delta: Partial<Record<NeedKey, number>>) {
  const out = { ...needs };
  for (const [k, v] of Object.entries(delta) as [NeedKey, number][]) out[k] = clamp(out[k] + v);
  return out;
}

function advanceCareData(data: PetData, timestamp: number): PetData {
  if (timestamp <= data.lastUpdated) return data;
  return {
    ...data,
    lastUpdated: timestamp,
    needs: simulatePetNeeds(data.needs, data.lastUpdated, timestamp, data.sleepStartedAt, data.sleepUntil),
  };
}

function ItemIcon({ item }: { item: Item }) {
  const illustrated = hasMaterialArt(item);
  return <div className={`item-icon ${item.img || illustrated ? 'has-img' : ''}`}>{illustrated ? <MaterialArt item={item} size={38}/> : item.img ? <img src={item.img} alt="" loading="lazy"/> : item.icon}</div>;
}

const TOY_TRAIT: Record<string, Trait> = { ball: 'verspielt', 'bone-toy': 'verspielt', duck: 'frech', rope: 'frech', frisbee: 'neugierig', teddy: 'anhaenglich', shampoo: 'anhaenglich' };
const ownsAll = (owned: string[], ids: string[]) => ids.every((id) => owned.includes(id));

function SaveError({ error }: { error: SaveLoadError }) {
  const [confirm, setConfirm] = useState(false);
  const download = () => {
    const blob = new Blob([error.raw], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tamascottchi-unlesbarer-spielstand.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  const startFresh = () => {
    localStorage.setItem(`tamascottchi-unreadable-save-${Date.now()}`, error.raw);
    localStorage.removeItem(STORE_KEY);
    window.location.reload();
  };
  return <div className="app-shell save-error" data-testid="save-error">
    <div className="brand"><span className="brand-mark">t</span>tamascottchi</div>
    <section className="dialog" style={{ margin: '40px auto' }}>
      <h2>Spielstand nicht lesbar</h2>
      <p data-testid="text-save-error">{error.message}</p>
      <p>Nichts wurde gelöscht. Lade die Datei herunter, bevor du etwas anderes tust.</p>
      <div className="dialog-actions">
        <button className="button" onClick={download} data-testid="button-download-broken-save"><Download size={14}/> Rohdaten sichern</button>
        <button className="button ghost" onClick={() => window.location.reload()} data-testid="button-retry-load">Erneut versuchen</button>
        {confirm ? <button className="button orange" onClick={startFresh} data-testid="button-confirm-fresh">Ja, neu starten (Kopie bleibt im Browser)</button>
          : <button className="button orange" onClick={() => setConfirm(true)} data-testid="button-start-fresh">Neu anfangen…</button>}
      </div>
    </section>
  </div>;
}

function App() {
  const lab = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null;
  const [loaded] = useState<{ data?: PetData; error?: SaveLoadError }>(() => {
    try { return { data: loadData() }; } catch (e) { return { error: e instanceof SaveLoadError ? e : new SaveLoadError(String(e), localStorage.getItem(STORE_KEY) || '') }; }
  });
  if (import.meta.env.DEV && lab && (lab.get('outfitEditor') === '1' || lab.get('outfitGallery') === '1')) {
    return <OutfitLab initialMode={lab.get('outfitEditor') === '1' ? 'editor' : 'gallery'}/>;
  }
  if (loaded.error || !loaded.data) return <SaveError error={loaded.error!}/>;
  return <Game initial={loaded.data}/>;
}

function Game({ initial }: { initial: PetData }) {
  const [data, setDataState] = useState<PetData>(initial);
  const setData = useCallback((update: PetData | ((current: PetData) => PetData)) => {
    setDataState((current) => {
      const timestamp = Date.now();
      const currentWithElapsedNeeds = advanceCareData(current, timestamp);
      const next = typeof update === 'function'
        ? update(currentWithElapsedNeeds)
        : advanceCareData(update, timestamp);
      const xp = Math.max(0, Math.min(MAX_PLAYER_XP, next.xp));
      return xp === next.xp ? next : { ...next, xp };
    });
  }, []);
  const dataRef = useRef(data); dataRef.current = data;
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const onlineUserId = isSignedIn ? user?.id ?? null : null;
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState<number | null>(null);
  const onlineProfileQuery = useGetOnlineProfile({
    query: { enabled: !!onlineUserId, queryKey: getGetOnlineProfileQueryKey(), retry: false },
  });
  const onlineSaveQuery = useGetOnlineSave({
    query: { enabled: !!onlineUserId && !!onlineProfileQuery.data, queryKey: getGetOnlineSaveQueryKey(), refetchOnWindowFocus: true },
  });
  const updateOnlineSave = useUpdateOnlineSave();
  const purchaseOnlineKey = usePurchaseOnlineChestKey();
  const openOnlineChest = useOpenOnlineRewardChest();
  const claimOnlineWorldChest = useClaimOnlineDailyWorldChest();
  const completeOnlineMinigame = useCompleteOnlineMinigameRound();
  const claimOnlineMinigameChest = useClaimOnlineMinigameDailyChest();
  const earnOnlineCharacterPoints = useEarnOnlineCharacterPoints();
  const purchaseOnlineEvolution = usePurchaseOnlineEvolution();
  const [cloudLink, setCloudLink] = useState<CloudLink | null>(null);
  const cloudLinkRef = useRef<CloudLink | null>(null);
  cloudLinkRef.current = cloudLink;
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('offline');
  const cloudSyncBusy = useRef(false);
  const chestActionBusy = useRef(new Set<string>());
  const chestRequestIds = useRef(new Map<string, string>());
  const characterActionNoticeShown = useRef(false);
  const completedSleepUntilRef = useRef<number | null>(null);
  const awardCharacterActivityRef = useRef<(activity: CharacterActivityId, toyId?: CharacterToyId) => Promise<boolean>>(async () => false);
  const [page, setPage] = useState('home');
  const [closetTab, setClosetTab] = useState<'wardrobe' | 'evolution'>('wardrobe');
  const [shopTab, setShopTab] = useState<Item['type'] | 'keys'>('food');
  const [pendingKeyPurchase, setPendingKeyPurchase] = useState<RewardChestTier | null>(null);
  const [pendingMinigameClaim, setPendingMinigameClaim] = useState<GameId | null>(null);
  const [selectedFood, setSelectedFood] = useState('kibble');
  const [modal, setModal] = useState<'settings' | 'reset' | 'import' | 'name' | null>(null);
  const [nameDraft, setNameDraft] = useState(data.name);
  const [petAction, setPetAction] = useState<PetAction>('idle');
  const [petSpeech, setPetSpeech] = useState('Ich bin eine Kreatur.');
  const [excited, setExcited] = useState(false);
  const [toast, setToast] = useState('');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [memoryPairs, setMemoryPairs] = useState(6);
  const [cupLevel, setCupLevel] = useState(1);
  const [toyFx, setToyFx] = useState<{ id: string; fx: string; key: number } | null>(null);
  const [aim, setAim] = useState<'ball' | 'frisbee' | null>(null);
  const [flight, setFlight] = useState<Throw | null>(null);
  const [run, setRun] = useState<{ dx: number; flip: boolean }>({ dx: 0, flip: false });
  const [chewing, setChewing] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ id: string; x: number; y: number } | null>(null);
  const roomRef = useRef<HTMLElement>(null);
  const dragDecor = useRef<{ id: string; pointerId: number } | null>(null);
  const [fileText, setFileText] = useState('');
  const [now, setNow] = useState(Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const soundContext = useRef<AudioContext | null>(null);
  const timers = useRef<Record<string, number | undefined>>({});
  const toyCooldown = useRef<Record<string, number>>({});
  const toyUsePending = useRef<Set<string>>(new Set());
  const rewardedSessions = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!onlineUserId) {
      setCloudLink(null);
      setCloudSyncStatus('offline');
      return;
    }
    setCloudLink(null);
    setCloudSyncStatus('checking');
  }, [onlineUserId]);

  useEffect(() => {
    let active = true;
    if (!onlineUserId) {
      setServerClockOffsetMs(null);
      return;
    }
    const syncServerClock = async () => {
      const startedAt = Date.now();
      try {
        const response = await fetch('/api/healthz', { cache: 'no-store' });
        const receivedAt = Date.now();
        const serverTime = Date.parse(response.headers.get('date') || '');
        if (response.ok && Number.isFinite(serverTime) && active) {
          setServerClockOffsetMs(serverTime + (receivedAt - startedAt) / 2 - receivedAt);
        }
      } catch {
        // Keep the last successful estimate; local play still works while offline.
      }
    };
    void syncServerClock();
    const timer = window.setInterval(() => void syncServerClock(), 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [onlineUserId]);

  useEffect(() => {
    if (!onlineUserId || !onlineProfileQuery.data || !onlineSaveQuery.data) return;
    const remote = onlineSaveQuery.data;
    if (!remote.saveData) {
      setCloudLink(null);
      cloudLinkRef.current = null;
      setCloudSyncStatus('unlinked');
      return;
    }

    const stored = localStorage.getItem(`tamascottchi-cloud-link:${onlineUserId}`);
    let marker: CloudLink | null = null;
    try {
      const parsed = stored ? JSON.parse(stored) as Partial<CloudLink> : null;
      if (parsed && parsed.userId === onlineUserId && Number.isInteger(parsed.revision) && typeof parsed.fingerprint === 'string') {
        marker = parsed as CloudLink;
      }
    } catch {
      marker = null;
    }

    if (cloudLink?.userId === onlineUserId && cloudLink.revision > remote.revision) return;
    if (cloudLink?.userId === onlineUserId && remote.revision > cloudLink.revision) {
      setCloudLink(null);
      cloudLinkRef.current = null;
      setCloudSyncStatus('conflict');
      return;
    }
    if (marker && marker.revision === remote.revision) {
      setCloudLink(marker);
      cloudLinkRef.current = marker;
      setCloudSyncStatus('synced');
    } else {
      setCloudLink(null);
      cloudLinkRef.current = null;
      setCloudSyncStatus(marker ? 'conflict' : 'unlinked');
    }
  }, [onlineUserId, onlineProfileQuery.data, onlineSaveQuery.data, cloudLink]);

  const linkCloudToCurrentSave = (revision: number, snapshot: PetData = data) => {
    if (!onlineUserId) return;
    const link = { userId: onlineUserId, revision, fingerprint: saveFingerprint(snapshot) };
    localStorage.setItem(`tamascottchi-cloud-link:${onlineUserId}`, JSON.stringify(link));
    cloudLinkRef.current = link;
    setCloudLink(link);
    setCloudSyncStatus('synced');
  };

  const restoreCloudSave = (saveData: Record<string, unknown>, revision: number) => {
    try {
      const restored = normalize(saveData as Partial<PetData>);
      if (saveData.minigameDaily && typeof saveData.minigameDaily === 'object') {
        restored.minigameDaily = saveData.minigameDaily as PetData['minigameDaily'];
      }
      assertSave(restored);
      setData(restored);
      linkCloudToCurrentSave(revision, restored);
      setToast('Cloud-Spielstand wurde auf diesem Gerät wiederhergestellt.');
    } catch {
      setToast('Die Cloud-Sicherung passt nicht zu dieser Spielversion. Dein lokaler Spielstand bleibt erhalten.');
    }
  };

  const syncCloudBeforeEconomy = async (): Promise<boolean> => {
    for (let attempt = 0; cloudSyncBusy.current && attempt < 40; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    const link = cloudLinkRef.current;
    if (!onlineUserId || !link || link.userId !== onlineUserId || cloudSyncBusy.current) return false;
    const snapshot = dataRef.current;
    const fingerprint = saveFingerprint(snapshot);
    if (fingerprint === link.fingerprint) return true;
    cloudSyncBusy.current = true;
    setCloudSyncStatus('syncing');
    try {
      const saved = await updateOnlineSave.mutateAsync({
        data: { expectedRevision: link.revision, saveData: snapshot },
      });
      const nextLink = { userId: onlineUserId, revision: saved.revision, fingerprint };
      localStorage.setItem(`tamascottchi-cloud-link:${onlineUserId}`, JSON.stringify(nextLink));
      cloudLinkRef.current = nextLink;
      setCloudLink(nextLink);
      setCloudSyncStatus('synced');
      queryClient.setQueryData(getGetOnlineSaveQueryKey(), (current) => current
        ? { ...current, saveData: snapshot, revision: saved.revision, updatedAt: saved.updatedAt }
        : current);
      return true;
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
      if (status === 409) {
        cloudLinkRef.current = null;
        setCloudLink(null);
        setCloudSyncStatus('conflict');
        void onlineSaveQuery.refetch();
      } else {
        setCloudSyncStatus('error');
      }
      return false;
    } finally {
      cloudSyncBusy.current = false;
    }
  };

  const applyOnlineEconomyResponse = (response: { saveData: Record<string, unknown>; revision: number; updatedAt: string | Date }) => {
    const restored = normalize(response.saveData as Partial<PetData>);
    if (response.saveData.minigameDaily && typeof response.saveData.minigameDaily === 'object') {
      restored.minigameDaily = response.saveData.minigameDaily as PetData['minigameDaily'];
    }
    assertSave(restored);
    dataRef.current = restored;
    setData(restored);
    if (onlineUserId) {
      linkCloudToCurrentSave(response.revision, restored);
      queryClient.setQueryData(getGetOnlineSaveQueryKey(), (current) => current
        ? { ...current, saveData: restored, revision: response.revision, updatedAt: response.updatedAt }
        : current);
      queryClient.setQueryData(getGetOnlineProfileQueryKey(), (current) => current
        ? { ...current, petName: restored.name, level: levelFor(restored.xp) }
        : current);
    }
    return restored;
  };

  const applyCharacterProgressResponse = (response: { saveData: Record<string, unknown>; revision: number; updatedAt: string | Date }) => {
    const serverSnapshot = normalize(response.saveData as Partial<PetData>);
    const latest = dataRef.current;
    const merged: PetData = {
      ...latest,
      characterPoints: serverSnapshot.characterPoints,
      characterDaily: serverSnapshot.characterDaily,
      characterProgressVersion: 1,
    };
    dataRef.current = merged;
    setData(merged);
    if (onlineUserId) {
      linkCloudToCurrentSave(response.revision, serverSnapshot);
      queryClient.setQueryData(getGetOnlineSaveQueryKey(), (current) => current
        ? { ...current, saveData: response.saveData, revision: response.revision, updatedAt: response.updatedAt }
        : current);
      if (saveFingerprint(merged) !== saveFingerprint(serverSnapshot)) {
        window.setTimeout(() => { void syncCloudBeforeEconomy(); }, 0);
      }
    }
    return merged;
  };

  useEffect(() => {
    if (!onlineUserId || !onlineProfileQuery.data || !onlineSaveQuery.data?.saveData || cloudLink?.userId !== onlineUserId) return;
    const snapshot = data;
    const fingerprint = saveFingerprint(snapshot);
    if (fingerprint === cloudLink.fingerprint) return;
    const timer = window.setTimeout(() => {
      if (cloudSyncBusy.current) return;
      cloudSyncBusy.current = true;
      setCloudSyncStatus('syncing');
      void updateOnlineSave.mutateAsync({
        data: { expectedRevision: cloudLink.revision, saveData: snapshot },
      }).then((result) => {
        const nextLink = { userId: onlineUserId, revision: result.revision, fingerprint };
        localStorage.setItem(`tamascottchi-cloud-link:${onlineUserId}`, JSON.stringify(nextLink));
        cloudLinkRef.current = nextLink;
        setCloudLink(nextLink);
        setCloudSyncStatus('synced');
        queryClient.setQueryData(getGetOnlineSaveQueryKey(), (current) => current
          ? { ...current, saveData: snapshot, revision: result.revision, updatedAt: result.updatedAt }
          : current);
        queryClient.setQueryData(getGetOnlineProfileQueryKey(), (current) => current
          ? { ...current, petName: snapshot.name, level: levelFor(snapshot.xp) }
          : current);
      }).catch((error: unknown) => {
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
        if (status === 409) {
          cloudLinkRef.current = null;
          setCloudLink(null);
          setCloudSyncStatus('conflict');
          void onlineSaveQuery.refetch();
        } else {
          setCloudSyncStatus('error');
        }
      }).finally(() => {
        cloudSyncBusy.current = false;
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [data, onlineUserId, onlineProfileQuery.data, onlineSaveQuery.data, cloudLink, updateOnlineSave.mutateAsync, queryClient]);

  useEffect(() => {
    const onOnline = () => {
      if (onlineUserId) void onlineSaveQuery.refetch();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [onlineUserId, onlineSaveQuery.refetch]);

  const later = useCallback((key: string, fn: () => void, ms: number) => {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(fn, ms);
  }, []);
  useEffect(() => () => { Object.values(timers.current).forEach((t) => window.clearTimeout(t)); }, []);

  // autosave
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }, [data]);
  // preload character sprites + room backgrounds so mood/room swaps never flash
  useEffect(() => {
    void preloadAll(CORE_SPRITES).then(() => Object.values(BACKGROUNDS).forEach((b) => void preloadImage(b.src)));
  }, []);
  // Recompute elapsed real time on a steady interval and immediately on return to the tab.
  useEffect(() => {
    const refreshCare = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      const current = dataRef.current;
      const completedSleep = current.sleepUntil !== null
        && current.sleepStartedAt !== null
        && current.sleepUntil <= timestamp
        && current.sleepUntil - current.sleepStartedAt >= 8 * 60 * 60 * 1000;
      if (completedSleep && cloudLinkRef.current && completedSleepUntilRef.current !== current.sleepUntil) {
        completedSleepUntilRef.current = current.sleepUntil;
        window.setTimeout(() => { void awardCharacterActivityRef.current('rest-complete'); }, 0);
      }
      setData((old) => {
        let next = advanceCareData(old, timestamp);
        if (next.sleepUntil !== null && next.sleepUntil <= timestamp) {
          next = { ...next, sleepUntil: null, sleepStartedAt: null, settings: { ...next.settings, lampOn: true } };
        }
        if (next.missionsDate !== today()) {
          next = { ...next, daily: { feeds: 0, games: 0, baths: 0, pets: 0, coins: 0 }, missions: {}, missionsDate: today() };
        }
        return next;
      });
    };
    refreshCare();
    const interval = window.setInterval(refreshCare, 60_000);
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshCare(); };
    document.addEventListener('visibilitychange', onVisibility);
    const clock = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const level = levelFor(data.xp);
  const minigameDailyNow = now + (serverClockOffsetMs || 0);
  const minigameDaily = normalizeMinigameDailyState(data.minigameDaily, minigameDailyNow, level);
  const characterDaily = normalizeCharacterDailyProgress(data.characterDaily, minigameDailyNow);
  const characterProgressLinked = !!onlineUserId && cloudLink?.userId === onlineUserId;
  const nextEvolution = EVOLUTION_STAGES[data.evolutionStage] || null;
  const traitRequirement = nextEvolution?.traitPointsRequired ?? EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1].traitPointsRequired;
  const traitProgressPercent = Math.min(...CHARACTER_TRAIT_IDS.map((trait) => traitRequirement
    ? Math.min(100, data.characterPoints[trait] / traitRequirement * 100)
    : 100));
  const evolutionLevelPercent = nextEvolution ? Math.min(100, level / nextEvolution.playerLevel * 100) : 100;
  const evolutionCoinPercent = nextEvolution ? Math.min(100, data.coins / Math.max(1, nextEvolution.coinCost) * 100) : 100;
  const evolutionProgressPercent = Math.floor(Math.min(traitProgressPercent, evolutionLevelPercent, evolutionCoinPercent));
  const minigameCoinCap = minigameDailyCoinCap(level);
  const completedMinigameTasks = Object.values(minigameDaily.taskPoints)
    .filter((points) => (points || 0) >= MINIGAME_DAILY_TASK_TARGET).length;
  const previousLevel = useRef(level);
  const levelProgress = playerLevelProgress(data.xp);
  const xpProgress = levelProgress.percent;
  const playerTitle = [...PLAYER_LEVEL_MILESTONES].reverse()
    .find((milestone) => milestone.playerTitle && data.claimedAchievements.includes(milestone.id))?.playerTitle || 'Scottchi-Fan';
  const topScore = useMemo(() => [...data.records].sort((a, b) => b.score - a.score).slice(0, 10), [data.records]);
  const notify = useCallback((message: string) => { setToast(message); later('toast', () => setToast(''), 2400); }, [later]);
  useEffect(() => {
    if (level > previousLevel.current) {
      const gained = level - previousLevel.current;
      previousLevel.current = level;
      setData((old) => recordJournal({ ...old, coins: old.coins + gained * 20 }, `level-${level}`, '⭐', `Level ${level} erreicht`, `+${gained * 20} Münzen als Levelbelohnung.`));
      notify(`Level ${level}! ${gained * 20} Münzen warten auf dich.`);
    }
  }, [level, notify]);
  useEffect(() => {
    setData((old) => releasePendingWorldDiscoveries(old));
  }, [level]);

  const settingsRef = useRef(data.settings); settingsRef.current = data.settings;
  const sound: SoundFn = useCallback((frequency = 540, opts = {}) => {
    const st = settingsRef.current;
    if (!st.sound || st.volume <= 0) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      soundContext.current ??= new AudioCtx();
      const ctx = soundContext.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const dur = opts.dur ?? 0.16;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = opts.type ?? 'triangle'; osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, ctx.currentTime + dur);
      gain.gain.setValueAtTime(0.08 * st.volume / 100, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* audio is optional */ }
  }, []);
  useEffect(() => {
    if (!data.settings.music || data.settings.volume <= 0) return undefined;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return undefined;
    soundContext.current ??= new AudioCtx();
    const context = soundContext.current;
    void context.resume();
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 392, 349.23];
    let index = 0;
    const playNote = () => {
      const o = context.createOscillator(); const g = context.createGain();
      o.type = 'sine'; o.frequency.value = notes[index++ % notes.length];
      g.gain.setValueAtTime(0.001, context.currentTime);
      g.gain.linearRampToValueAtTime(0.012 * data.settings.volume / 100, context.currentTime + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.48);
      o.connect(g); g.connect(context.destination); o.start(); o.stop(context.currentTime + 0.5);
    };
    playNote();
    const timer = window.setInterval(playNote, 650);
    return () => window.clearInterval(timer);
  }, [data.settings.music, data.settings.volume]);

  const sleeping = !!data.sleepUntil && data.sleepUntil > now;
  const mood = moodFor(data.needs, excited, sleeping);
  const phase = dayPhase(new Date(now));
  const trait = dominant(data.personality);
  const showsTrait = hasCharacter(data.personality);
  const idleStyle = sleeping ? undefined : phase === 'abend' || phase === 'nacht' ? 'sway' : showsTrait ? IDLE_CLASS[trait] : undefined;
  function cheer(ms = 3500) { setExcited(true); later('excited', () => setExcited(false), ms); }
  function showPetAction(action: PetAction, line: string, ms = 1800) {
    setPetAction(action); setPetSpeech(line);
    if (action !== 'sleeping') later('pet', () => setPetAction('idle'), ms);
  }
  const grow = (t: Trait, amount = 1) => setData((old) => ({ ...old, personality: nudge(old.personality, t, amount) }));

  // ---------- daily routine: greeting once per local day, welcome back without penalty ----------
  useEffect(() => {
    const d = dataRef.current;
    const awayH = (Date.now() - (d.routine.lastSeen || Date.now())) / 3600000;
    const p = dayPhase();
    if (d.routine.greetedDate !== today()) {
      const line = p === 'morgen' ? `Guten Morgen! *streck* Neue Tagesaufgaben sind da.` : p === 'abend' ? 'Guten Abend! Schön, dass du da bist.' : p === 'nacht' ? 'Oh, du bist noch wach? Hallo!' : 'Hallo! Neuer Tag, neue Aufgaben.';
      showPetAction('wake', awayH > 24 ? `Du warst weg, aber alles gut. ${line}` : line, 2600);
      notify(p === 'morgen' ? 'Scottchi ist aufgewacht. Neue Tagesaufgaben!' : 'Neue Tagesaufgaben sind da.');
      setData((old) => ({ ...old, routine: { ...old.routine, greetedDate: today(), lastSeen: Date.now() } }));
    } else if (awayH > 6) {
      showPetAction('happy', 'Da bist du ja wieder! Ich hab dich vermisst.', 2400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setData((old) => ({ ...old, routine: { ...old.routine, lastSeen: Date.now() } })), 60000);
    return () => window.clearInterval(id);
  }, []);
  // ---------- personality idle chatter + small surprises (visible tab, home page, awake) ----------
  const idleCtx = useRef({ page, sleeping, petAction, aim, flight: !!flight });
  idleCtx.current = { page, sleeping, petAction, aim, flight: !!flight };
  useEffect(() => {
    const id = window.setInterval(() => {
      const c = idleCtx.current; const d = dataRef.current;
      if (document.visibilityState !== 'visible' || c.page !== 'home' || c.sleeping || c.petAction !== 'idle' || c.aim || c.flight) return;
      const p = dayPhase(); const t = dominant(d.personality); const character = hasCharacter(d.personality);
      const surprisesToday = d.routine.surpriseDate === today() ? d.routine.surprises : 0;
      if (p !== 'nacht' && surprisesToday < 3 && Math.random() < 0.22) {
        const pool = SURPRISES[character ? t : (['verspielt', 'neugierig', 'anhaenglich'] as Trait[])[Math.floor(Math.random() * 3)]];
        const s = pool[Math.floor(Math.random() * pool.length)];
        setData((old) => ({ ...old, coins: old.coins + s.coins, needs: applyNeeds(old.needs, s.need || {}), routine: { ...old.routine, surpriseDate: today(), surprises: (old.routine.surpriseDate === today() ? old.routine.surprises : 0) + 1 } }));
        showPetAction('happy', 'Schau mal, was ich habe!', 2200); notify(`${s.line} +${s.coins} Münzen`);
        return;
      }
      if ((p === 'abend' || p === 'nacht') && Math.random() < 0.5) { showPetAction('yawn', IDLE_LINES.verschlafen[Math.floor(Math.random() * 3)], 2400); return; }
      const lines = character ? IDLE_LINES[t] : ['Was guckst du?', 'Ich bin eine Kreatur.', 'Was passiert hier eigentlich?'];
      setPetSpeech(lines[Math.floor(Math.random() * lines.length)]);
    }, 28000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- games ----------
  const requestStart = useCallback(() => {
    if (dataRef.current.needs.energie < 20) { notify('Scottchi braucht erst Schlaf. Besuch das Schlafzimmer.'); return false; }
    const energyReduction = applicableArtifactBonus(dataRef.current, 'energy', 'world');
    const energyCost = Math.max(1, Math.ceil(8 * (1 - energyReduction / 100)));
    setData((old) => ({ ...old, needs: { ...old.needs, energie: clamp(old.needs.energie - energyCost) } }));
    return true;
  }, [notify]);
  const completeGame = useCallback(async (game: GameId, sessionId: string, result: GameResult): Promise<RewardSummary> => {
    let cur = dataRef.current;
    if (rewardedSessions.current.has(sessionId)) {
      const state = normalizeMinigameDailyState(cur.minigameDaily, minigameDailyNow, levelFor(cur.xp));
      return {
        coins: 0, xp: 0, newBest: false, best: cur.highscores[game] || 0, challenges: [], challengeChests: [], reduced: false,
        dailyXp: state.xp, dailyXpCap: MINIGAME_DAILY_XP_CAP, dailyCoins: state.coins, dailyCoinCap: minigameDailyCoinCap(levelFor(cur.xp)),
        taskProgress: state.taskPoints[game] || 0, taskTarget: MINIGAME_DAILY_TASK_TARGET, taskPointsEarned: 0,
      };
    }

    let repeatableXp = 0;
    let repeatableCoins = 0;
    let repeatableState = normalizeMinigameDailyState(cur.minigameDaily, minigameDailyNow, levelFor(cur.xp));
    let taskProgress = repeatableState.taskPoints[game] || 0;
    let taskPointsEarned = 0;
    let reduced = false;
    const linkedCloud = !!onlineUserId && cloudLinkRef.current?.userId === onlineUserId;
    if (linkedCloud) {
      if (!await syncCloudBeforeEconomy()) throw new Error('Cloud-Spielstand konnte nicht synchronisiert werden.');
      const response = await completeOnlineMinigame.mutateAsync({
        data: { gameId: game, score: Math.max(0, Math.floor(result.score)), requestId: sessionId },
      });
      cur = applyOnlineEconomyResponse(response);
      const reward = response.reward || {};
      repeatableXp = Math.max(0, Number(reward.xp) || 0);
      repeatableCoins = Math.max(0, Number(reward.coins) || 0);
      repeatableState = cur.minigameDaily;
      taskProgress = Math.max(0, Number(reward.taskProgress) || 0);
      taskPointsEarned = Math.max(0, Number(reward.taskPointsEarned) || 0);
      reduced = Boolean(reward.reduced);
      rewardedSessions.current.add(sessionId);
    } else {
      const levelAtRoundStart = levelFor(cur.xp);
      const payout = applyMinigameRound(cur.minigameDaily, game, result.score, levelAtRoundStart, minigameDailyNow, {
        coins: applicableArtifactBonus(cur, 'coins', 'games'),
        xp: applicableArtifactBonus(cur, 'xp', 'games'),
      });
      repeatableXp = payout.xp;
      repeatableCoins = payout.coins;
      repeatableState = payout.state;
      taskProgress = payout.taskProgress;
      taskPointsEarned = payout.taskPointsEarned;
      reduced = payout.reduced;
    }

    const prevBest = cur.highscores[game] || 0;
    const newChallenges = CHALLENGES.filter((challenge) =>
      challenge.game === game && !cur.challenges[challenge.id] && challenge.test(result.score, result.metrics));
    const challengeCoins = applyArtifactBonus(
      newChallenges.reduce((total, challenge) => total + challenge.coins, 0),
      applicableArtifactBonus(cur, 'coins', 'games'),
    );
    const challengeXp = applyArtifactBonus(
      newChallenges.reduce((total, challenge) => total + challenge.xp, 0),
      applicableArtifactBonus(cur, 'xp', 'games'),
    );
    const coins = repeatableCoins + challengeCoins;
    const xp = repeatableXp + challengeXp;
    const earnedScoreMilestones = MINIGAME_SCORE_CHEST_MILESTONES.filter((milestone) =>
      result.score >= milestone.score && !cur.world.milestoneChestsClaimed.includes(milestone.id));
    const completedChallengeIds = new Set(newChallenges.map((challenge) => challenge.id));
    const challengeSeriesComplete = CHALLENGES.every((challenge) =>
      cur.challenges[challenge.id] || completedChallengeIds.has(challenge.id));
    const earnsChallengeSeriesChest = challengeSeriesComplete &&
      !cur.world.milestoneChestsClaimed.includes('all-minigame-challenges');
    const chestSlots = Math.max(0, 3 - cur.world.dailyChestCount);
    const visibleChestRewards = earnedScoreMilestones.slice(0, chestSlots);
    const summary: RewardSummary = {
      coins, xp,
      newBest: result.score > prevBest && result.score > 0, best: Math.max(prevBest, result.score),
      challenges: newChallenges.map((challenge) => `${challenge.title} · +${challenge.dust} Artefaktstaub`),
      challengeChests: [
        ...visibleChestRewards.map((milestone) => ({ id: milestone.id, title: milestone.title, tier: milestone.tier })),
        ...(earnsChallengeSeriesChest ? [{ id: 'all-minigame-challenges', title: 'Alle Minispiel-Challenges', tier: 'rare' as const }] : []),
      ],
      reduced,
      dailyXp: repeatableState.xp,
      dailyXpCap: MINIGAME_DAILY_XP_CAP,
      dailyCoins: repeatableState.coins,
      dailyCoinCap: minigameDailyCoinCap(levelFor(cur.xp)),
      taskProgress,
      taskTarget: MINIGAME_DAILY_TASK_TARGET,
      taskPointsEarned,
    };
    if (linkedCloud && !rewardedSessions.current.has(sessionId)) rewardedSessions.current.add(sessionId);
    const record: GameRecord = { id: sessionId, game, score: result.score, date: Date.now() };
    const challenges = { ...cur.challenges };
    const challengeDust = newChallenges.reduce((total, challenge) => total + challenge.dust, 0);
    let compensationDust = 0;
    for (const challenge of newChallenges) if (!challenges[challenge.id]) challenges[challenge.id] = Date.now();
    let next: PetData = {
      ...cur,
      records: [record, ...cur.records].slice(0, 100),
      coins: cur.coins + (linkedCloud ? challengeCoins : coins),
      xp: cur.xp + (linkedCloud ? challengeXp : xp),
      minigameDaily: repeatableState,
      highscores: { ...cur.highscores, [game]: Math.max(cur.highscores[game] || 0, result.score) },
      challenges,
      inventory: { ...cur.inventory, 'artifact-dust': (cur.inventory['artifact-dust'] || 0) + challengeDust },
      needs: applyNeeds(cur.needs, { glueck: 6 }),
      stats: { ...cur.stats, games: cur.stats.games + 1, catches: cur.stats.catches + (result.metrics.caught || 0), taps: cur.stats.taps + (result.metrics.hits || 0) },
    };
    const earnedIds = new Set(cur.world.milestoneChestsClaimed);
    for (const [index, milestone] of earnedScoreMilestones.entries()) {
      earnedIds.add(milestone.id);
      if (index < chestSlots) {
        next = grantRegularChest(next, milestone.tier, `challenge:${cur.world.worldDay}:${milestone.id}`, Date.now(), `challenge:${milestone.id}`);
      } else {
        compensationDust += milestone.dust;
      }
    }
    if (challengeSeriesComplete) next = grantMilestoneChest(next, 'all-minigame-challenges', 'rare', Date.now());
    next = {
      ...next,
      inventory: { ...next.inventory, 'artifact-dust': (next.inventory['artifact-dust'] || 0) + compensationDust },
      world: { ...next.world, milestoneChestsClaimed: [...earnedIds] },
    };
    if (result.score > (cur.highscores[game] || 0)) {
      next = recordJournal(next, `record-${sessionId}`, '🏅', `Neuer Bestwert: ${GAMES.find((entry) => entry.id === game)?.name || game}`, `${result.score} Punkte erreicht.`);
    }
    next = advanceDaily({ ...next, personality: nudge(next.personality, 'verspielt', 0.8) }, 'games');
    next = advanceDaily(next, 'coins', coins);
    rewardedSessions.current.add(sessionId);
    dataRef.current = next;
    setData(next);
    if (linkedCloud && !await syncCloudBeforeEconomy()) {
      notify('Minispiel-Belohnung ist sicher gespeichert; weitere Rundendaten werden später synchronisiert.');
    }
    void awardCharacterActivity('minigame');
    sound(780, { dur: 0.25, slide: 1170 });
    if (result.score > 0 || newChallenges.length) cheer(5000);
    return summary;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound, onlineUserId, completeOnlineMinigame.mutateAsync, minigameDailyNow]);
  const openChest = useCallback((tier: RewardChestTier) => {
    if (onlineUserId && cloudLinkRef.current?.userId === onlineUserId) {
      setPage('collections');
      notify('Öffne verknüpfte Kisten im Sammeln-Menü, damit Schlüssel und Belohnungen serverseitig geprüft werden.');
      return null;
    }
    const opened = openRewardChest(dataRef.current, tier, Math.random, levelFor(dataRef.current.xp));
    if (!opened) {
      notify((dataRef.current.world.keys[tier] || 0) < 1 ? `Für diese Kiste brauchst du einen ${CHEST_DEFINITIONS[tier].label}-Schlüssel.` : 'Diese Kiste ist noch nicht verfügbar.');
      return null;
    }
    const next = advanceDaily(opened.data, 'coins', opened.reward.coins);
    dataRef.current = next;
    setData(next);
    sound(opened.reward.rarity === 'Legendary' ? 520 : 900, {
      dur: opened.reward.rarity === 'Legendary' ? 0.42 : 0.18,
      slide: opened.reward.rarity === 'Legendary' ? 1580 : 1320,
      type: opened.reward.rarity === 'Legendary' ? 'sine' : 'triangle',
    });
    if (opened.reward.rarity === 'Legendary') cheer(3000);
    return opened.reward;
  }, [onlineUserId, notify, sound, cheer]);
  function purchaseChestKey(tier: RewardChestTier): boolean {
    const result = buyChestKey(dataRef.current, tier, levelFor(dataRef.current.xp));
    if (!result.ok) {
      notify(result.reason === 'locked' ? `Der Schlüssel wird ab Level ${CHEST_UNLOCK_LEVEL[tier]} freigeschaltet.` : 'Dafür fehlen Münzen.');
      return false;
    }
    dataRef.current = result.data;
    setData(result.data);
    notify(`${CHEST_DEFINITIONS[tier].label}-Schlüssel gekauft.`);
    sound(760);
    return true;
  }
  function serverActionError(error: unknown) {
    if (typeof error === 'object' && error !== null && 'data' in error) {
      const payload = (error as { data?: { error?: unknown } }).data;
      if (typeof payload?.error === 'string') return payload.error;
    }
    return error instanceof Error ? error.message : 'Die Serveraktion konnte nicht abgeschlossen werden.';
  }
  function requestIdFor(actionKey: string) {
    let requestId = chestRequestIds.current.get(actionKey);
    if (!requestId) {
      requestId = crypto.randomUUID();
      chestRequestIds.current.set(actionKey, requestId);
    }
    return requestId;
  }
  async function withChestAction<T>(actionKey: string, operation: () => Promise<T>): Promise<T | null> {
    if (chestActionBusy.current.has(actionKey)) return null;
    chestActionBusy.current.add(actionKey);
    try {
      return await operation();
    } finally {
      chestActionBusy.current.delete(actionKey);
    }
  }
  async function awardCharacterActivity(activity: CharacterActivityId, toyId?: CharacterToyId): Promise<boolean> {
    const actionKey = `character:${activity}:${toyId || ''}`;
    const clockNow = Date.now() + (serverClockOffsetMs || 0);
    const daily = normalizeCharacterDailyProgress(dataRef.current.characterDaily, clockNow);
    if (daily.earned >= CHARACTER_DAILY_POINT_CAP || daily.nextAwardAt > clockNow) return false;
    if (!onlineUserId || cloudLinkRef.current?.userId !== onlineUserId) {
      if (!characterActionNoticeShown.current) {
        characterActionNoticeShown.current = true;
        notify('Charakterpunkte werden nur mit verknüpftem Online-Konto gesammelt. Interaktionen funktionieren weiterhin.');
      }
      return false;
    }
    if (chestActionBusy.current.has(actionKey)) return false;
    return (await withChestAction(actionKey, async () => {
      if (!await syncCloudBeforeEconomy()) {
        notify('Die Charakteraktion war erfolgreich, aber die Punkte konnten nicht sicher synchronisiert werden. Bitte später erneut verbinden.');
        return false;
      }
      try {
        const result = await earnOnlineCharacterPoints.mutateAsync({
          data: { activity, ...(toyId ? { toyId } : {}), requestId: requestIdFor(actionKey) },
        });
        applyCharacterProgressResponse(result);
        chestRequestIds.current.delete(actionKey);
        return true;
      } catch (error) {
        const status = typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
        const message = serverActionError(error);
        if (status === 409 || status === 429) {
          chestRequestIds.current.delete(actionKey);
          const currentDaily = normalizeCharacterDailyProgress(dataRef.current.characterDaily, clockNow);
          const updated = {
            ...dataRef.current,
            characterDaily: status === 429
              ? { ...currentDaily, nextAwardAt: clockNow + 20_000 }
              : message.includes('Tageslimit')
                ? { ...currentDaily, earned: CHARACTER_DAILY_POINT_CAP }
                : currentDaily,
          };
          dataRef.current = updated;
          setData(updated);
        } else {
          notify(message);
        }
        return false;
      }
    })) ?? false;
  }
  awardCharacterActivityRef.current = awardCharacterActivity;
  async function purchaseChestKeyAction(tier: RewardChestTier): Promise<boolean> {
    const actionKey = `key:${tier}`;
    if (chestActionBusy.current.has(actionKey)) return false;
    setPendingKeyPurchase(tier);
    try {
    return (await withChestAction(actionKey, async () => {
      if (onlineUserId && cloudLinkRef.current?.userId === onlineUserId) {
        if (!await syncCloudBeforeEconomy()) {
          notify('Der Cloud-Spielstand ist gerade nicht synchron. Bitte versuche es gleich noch einmal.');
          return false;
        }
        try {
          const result = await purchaseOnlineKey.mutateAsync({ data: { tier, requestId: requestIdFor(actionKey) } });
          applyOnlineEconomyResponse(result);
          chestRequestIds.current.delete(actionKey);
          notify(`${CHEST_DEFINITIONS[tier].label}-Schlüssel gekauft.`);
          sound(760);
          return true;
        } catch (error) {
          notify(serverActionError(error));
          return false;
        }
      }
      if (onlineUserId && onlineSaveQuery.data?.saveData) {
        notify('Verbinde zuerst den Cloud-Spielstand, damit dieser Kauf abgesichert wird.');
        return false;
      }
      return purchaseChestKey(tier);
    })) ?? false;
    } finally {
      setPendingKeyPurchase(null);
    }
  }
  async function openChestFromCollection(tier: RewardChestTier): Promise<ChestOpenReward | null> {
    return (await withChestAction(`open:${tier}`, async () => {
      const actionKey = `open:${tier}`;
      if (onlineUserId && cloudLinkRef.current?.userId === onlineUserId) {
        if (!await syncCloudBeforeEconomy()) {
          notify('Der Cloud-Spielstand ist gerade nicht synchron. Bitte versuche es gleich noch einmal.');
          return null;
        }
        try {
          const result = await openOnlineChest.mutateAsync({ data: { tier, requestId: requestIdFor(actionKey) } });
          applyOnlineEconomyResponse(result);
          chestRequestIds.current.delete(actionKey);
          const reward = result.reward || {};
          const itemId = typeof reward.itemId === 'string' ? reward.itemId : '';
          const artifact = ARTIFACTS.find((entry) => entry.id === itemId);
          if (!artifact) {
            notify('Die Kiste wurde geöffnet, aber die Fundanzeige konnte nicht geladen werden.');
            return null;
          }
          const openedReward: ChestOpenReward = {
            tier,
            chestName: CHEST_DEFINITIONS[tier].label,
            itemId,
            itemName: artifact.name,
            quantity: 1,
            coins: Number(reward.coins) || 0,
            xp: Number(reward.xp) || 0,
            isCollectionFind: Boolean(reward.isCollectionFind),
            collectionItem: artifact,
            rarity: artifact.rarity,
            isDuplicate: Boolean(reward.isDuplicate),
            duplicateDust: Number(reward.duplicateDust) || 0,
            epicEssence: Number(reward.epicEssence) || 0,
            legendaryEssence: Number(reward.legendaryEssence) || 0,
            inventoryItemId: COLLECTION_ITEM_LINKS[itemId] || itemId,
            source: typeof reward.source === 'string' ? reward.source : 'Scottchi World',
          };
          sound(openedReward.rarity === 'Legendary' ? 520 : 900, { dur: openedReward.rarity === 'Legendary' ? 0.42 : 0.18, slide: 1320 });
          if (openedReward.rarity === 'Legendary') cheer(3000);
          return openedReward;
        } catch (error) {
          notify(serverActionError(error));
          return null;
        }
      }
      if (onlineUserId && onlineSaveQuery.data?.saveData) {
        notify('Verbinde zuerst den Cloud-Spielstand, damit diese Kiste serverseitig geöffnet wird.');
        return null;
      }
      return openChest(tier);
    })) ?? null;
  }
  async function claimDailyWorldChest(locationId: string): Promise<boolean> {
    return (await withChestAction(`daily:${locationId}`, async () => {
      const actionKey = `daily:${locationId}`;
      if (onlineUserId && cloudLinkRef.current?.userId === onlineUserId) {
        if (!await syncCloudBeforeEconomy()) {
          notify('Der Cloud-Spielstand ist gerade nicht synchron. Bitte versuche es gleich noch einmal.');
          return false;
        }
        try {
          const result = await claimOnlineWorldChest.mutateAsync({
            data: { locationId: locationId as 'park' | 'city' | 'forest' | 'beach' | 'cave' | 'mountain', requestId: requestIdFor(actionKey) },
          });
          applyOnlineEconomyResponse(result);
          chestRequestIds.current.delete(actionKey);
          const tier = typeof result.reward?.tier === 'string' ? result.reward.tier : '';
          const tierLabel = CHEST_TIERS.includes(tier as RewardChestTier) ? CHEST_DEFINITIONS[tier as RewardChestTier].label : 'Weltkiste';
          notify(`${locationId}: ${tierLabel} liegt im Tresor.`);
          return true;
        } catch (error) {
          notify(serverActionError(error));
          return false;
        }
      }
      notify(onlineUserId && onlineSaveQuery.data?.saveData
        ? 'Verbinde zuerst den Cloud-Spielstand, um die Weltkiste sicher abzuholen.'
        : 'Die Tageskiste kann aus der lokalen Weltaufgabe abgeholt werden.');
      return false;
    })) ?? false;
  }
  async function claimMinigameDailyChestAction(game: GameId): Promise<boolean> {
    const actionKey = `minigame-daily:${minigameDaily.day}:${game}`;
    if (chestActionBusy.current.has(actionKey)) return false;
    setPendingMinigameClaim(game);
    try {
      return (await withChestAction(actionKey, async () => {
        if (onlineUserId && cloudLinkRef.current?.userId === onlineUserId) {
          if (!await syncCloudBeforeEconomy()) {
            notify('Der Cloud-Spielstand ist gerade nicht synchron. Bitte versuche es gleich noch einmal.');
            return false;
          }
          try {
            const response = await claimOnlineMinigameChest.mutateAsync({
              data: { gameId: game, requestId: requestIdFor(actionKey) },
            });
            applyOnlineEconomyResponse(response);
            chestRequestIds.current.delete(actionKey);
            const tier = typeof response.reward?.tier === 'string' ? response.reward.tier : '';
            const label = CHEST_TIERS.includes(tier as RewardChestTier) ? CHEST_DEFINITIONS[tier as RewardChestTier].label : 'Tageskiste';
            notify(`${GAMES.find((entry) => entry.id === game)?.name || 'Minispiel'}: ${label} liegt im Tresor.`);
            return true;
          } catch (error) {
            notify(serverActionError(error));
            return false;
          }
        }

        const current = dataRef.current;
        const claim = claimMinigameDailyChest(current.minigameDaily, game, levelFor(current.xp), minigameDailyNow, Math.random);
        if (!claim.ok) {
          notify(claim.error === 'task-incomplete' ? 'Schließe zuerst die Tagesaufgabe dieses Minispiels ab.' : 'Die Tageskiste dieses Minispiels wurde bereits abgeholt.');
          return false;
        }
        const source = `minigame-daily:${claim.state.day}:${game}`;
        const next = grantChest({ ...current, minigameDaily: claim.state }, claim.tier, source, minigameDailyNow);
        dataRef.current = next;
        setData(next);
        notify(`${GAMES.find((entry) => entry.id === game)?.name || 'Minispiel'}: ${CHEST_DEFINITIONS[claim.tier].label} liegt im Tresor.`);
        return true;
      })) ?? false;
    } finally {
      setPendingMinigameClaim(null);
    }
  }
  function openGame(id: GameId) { setPage('games'); setActiveGame(id); }

  // ---------- care ----------
  function performNeed(id: NeedKey, preferredId = selectedFood) {
    if (id === 'hunger') {
      const preferred = ITEMS.find((item) => item.id === preferredId && item.effect === 'hunger');
      const food = (preferred && data.inventory[preferred.id] > 0 ? preferred : null) || ITEMS.find((item) => item.effect === 'hunger' && (data.inventory[item.id] || 0) > 0);
      if (!food) { notify('Der Vorrat ist leer. Im Laden gibt es Snacks.'); return; }
      if (data.needs.hunger >= 100) { notify('Scottchi ist schon pappsatt.'); return; }
      const bowl = data.owned.includes('bowl') ? 1.25 : 1;
      setData((old) => advanceDaily({
        ...old, inventory: { ...old.inventory, [food.id]: Math.max(0, (old.inventory[food.id] || 0) - 1) },
        needs: applyNeeds({ ...old.needs, hunger: clamp(old.needs.hunger + (food.amount || 12) * bowl) }, food.effects || {}),
        personality: nudge(old.personality, 'anhaenglich', 0.5), xp: old.xp + 9, stats: { ...old.stats, care: old.stats.care + 1 },
      }, 'feeds'));
      void awardCharacterActivity('feeding');
      showPetAction('eating', showsTrait ? FOOD_LINES[trait] : `Mmmh, ${food.name.toLowerCase()}!`, 2000);
      if (showsTrait && trait === 'frech') grow('frech', 0.3);
      notify(`${food.name} für ${data.name}${bowl > 1 ? ' aus dem Napf' : ''}!`); sound(680); return;
    }
    if (id === 'sauberkeit') {
      if ((data.inventory.soap || 0) < 1) { notify(data.owned.includes('shampoo') ? 'Keine Seife. Im Bad kannst du das Shampoo benutzen.' : 'Für ein Schaumbad brauchst du noch Seife aus dem Laden.'); return; }
      if (data.needs.sauberkeit >= 100) { notify('Scottchi ist schon blitzsauber.'); return; }
      setData((old) => advanceDaily({
        ...old, inventory: { ...old.inventory, soap: Math.max(0, (old.inventory.soap || 0) - 1) },
        needs: { ...old.needs, sauberkeit: clamp(old.needs.sauberkeit + 35) },
        personality: nudge(old.personality, 'anhaenglich', 0.7), xp: old.xp + 10, stats: { ...old.stats, care: old.stats.care + 1 },
      }, 'baths'));
      void awardCharacterActivity('bathing');
      showPetAction('washing', 'Blasen! Blasen! Das kitzelt.');
      notify('Schaumwolke! Scottchi ist wieder sauber.'); sound(760); return;
    }
    if (dataRef.current.needs.glueck >= 100) { notify('Scottchi ist schon rundum glücklich und braucht gerade keine Tobepause.'); return; }
    if (data.needs.energie < 10) { notify('Scottchi braucht erst eine Pause.'); return; }
    setData((old) => ({ ...old, needs: { ...old.needs, glueck: clamp(old.needs.glueck + 12), energie: clamp(old.needs.energie - 4) }, xp: old.xp + 4, stats: { ...old.stats, care: old.stats.care + 1 } }));
    void awardCharacterActivity('playful-interaction');
    showPetAction('happy', 'Wuff oder so!'); cheer(1800); grow('frech', 0.8);
    notify('Scottchi macht einen Quatsch-Sprung.'); sound(720);
  }
  function pet() {
    if (sleeping) { showPetAction('sleeping', 'Zzz… nur noch fünf Minuten.'); return; }
    const canImproveMood = dataRef.current.needs.glueck < 100;
    setData((old) => advanceDaily({
      ...old,
      needs: { ...old.needs, glueck: clamp(old.needs.glueck + (canImproveMood ? 8 : 0)) },
      xp: old.xp + (canImproveMood ? 4 : 0),
      stats: { ...old.stats, care: old.stats.care + 1 },
    }, 'pets'));
    if (canImproveMood) void awardCharacterActivity('cuddle');
    const lines = ['Das kitzelt!', 'Was guckst du?', 'Wuff oder so!', 'Ich bin eine Kreatur.', 'Was passiert hier eigentlich?', 'Ich habe existenzielle Fragen.'];
    const pool = showsTrait ? [...lines.slice(0, 3), ...IDLE_LINES[trait]] : lines;
    showPetAction('petting', pool[Math.floor(Math.random() * pool.length)]);
    if (canImproveMood) grow('anhaenglich', 0.7);
    notify(canImproveMood ? `${data.name} freut sich.` : `${data.name} genießt die Nähe, ist aber schon ganz glücklich.`); sound(650);
  }
  function playToy(id: string) {
    const use = TOY_USE[id];
    const item = itemById(id);
    const current = dataRef.current;
    if (!use || !item) return;
    if ((current.inventory[id] || 0) < 1) { notify(`${item.name} ist aufgebraucht. Stelle oder kaufe ein neues Exemplar.`); return; }
    if (toyUsePending.current.has(id)) { notify(`${item.name} wird gerade benutzt.`); return; }
    if (sleeping) { notify('Psst, Scottchi schläft.'); return; }
    if (use.room && current.room !== use.room) { notify(`${item.name} funktioniert nur im ${use.room}.`); return; }
    if (use.energy && current.needs.energie < use.energy) { notify('Zu müde zum Toben. Erst schlafen.'); return; }
    if ((toyCooldown.current[id] || 0) > Date.now()) { notify('Scottchi braucht nach dem Spielen noch kurz Pause.'); return; }
    if (id === 'ball' || id === 'frisbee') { if (!flight) setAim(id); return; }
    toyUsePending.current.add(id);
    if (!rewardToy(id)) return;
    if (id === 'bone-toy') { setChewing(true); later('chew', () => setChewing(false), 2600); }
    else if (id !== 'teddy') { setToyFx({ id, fx: use.fx, key: Date.now() }); later('toy', () => setToyFx(null), 1300); }
    sound(use.freq, { dur: id === 'duck' ? 0.18 : 0.2, slide: use.slide, type: id === 'duck' ? 'square' : 'triangle' });
    showPetAction(dataRef.current.evolutionStage >= 3 && id !== 'shampoo' ? 'spin' : use.action, use.line, id === 'bone-toy' ? 2600 : 1800);
  }
  function rewardToy(id: string): boolean {
    const use = TOY_USE[id];
    const current = dataRef.current;
    const inventory = consumeToyStock(current.inventory, id);
    if (!use || !inventory || (toyCooldown.current[id] || 0) > Date.now()) {
      toyUsePending.current.delete(id);
      return false;
    }
    const fav = showsTrait && FAVORITE_TOY[trait] === id;
    if (fav) later('favline', () => setPetSpeech(TOY_LINES[trait]), 1300);
    toyCooldown.current[id] = Date.now() + use.cooldown * 1000;
    if (use.action !== 'washing') cheer(2200);
    const baseNeed = fav ? Object.fromEntries(Object.entries(use.need).map(([key, value]) => [key, key === 'glueck' ? value + 4 : value])) : use.need;
    const funPercent = applicableArtifactBonus(current, 'fun', 'play');
    const need = funPercent > 0 && baseNeed.glueck
      ? { ...baseNeed, glueck: Math.round(baseNeed.glueck * (1 + funPercent / 100)) }
      : baseNeed;
    const remaining = inventory[id];
    let next: PetData = {
      ...current,
      inventory,
      owned: id === 'shampoo' && remaining === 0 ? current.owned.filter((ownedId) => ownedId !== id) : current.owned,
      personality: nudge(current.personality, TOY_TRAIT[id] || 'verspielt', 0.9),
      needs: applyNeeds(current.needs, need), xp: current.xp + 5,
      stats: { ...current.stats, toys: (current.stats.toys || 0) + 1, care: current.stats.care + 1 },
    };
    if (id === 'shampoo') next = advanceDaily(next, 'baths');
    dataRef.current = next;
    setData(next);
    if (id in CHARACTER_TOY_TRAITS) void awardCharacterActivity('toy-use', id as CharacterToyId);
    toyUsePending.current.delete(id);
    return true;
  }
  /** Ball/frisbee: toy flies to the aimed point, Scottchi runs there (flipping to face it), picks it up and trots back. */
  function throwToy(id: 'ball' | 'frisbee', from: Point, to: Point) {
    const current = dataRef.current;
    if ((current.inventory[id] || 0) < 1) { setAim(null); notify(`${itemById(id)?.name || 'Spielzeug'} ist aufgebraucht.`); return; }
    if (toyUsePending.current.has(id) || (toyCooldown.current[id] || 0) > Date.now()) { setAim(null); notify('Scottchi braucht nach dem Spielen noch kurz Pause.'); return; }
    setAim(null);
    const img = itemById(id)?.img; if (!img) return;
    toyUsePending.current.add(id);
    setFlight({ id, kind: id, img, from, to, key: Date.now() });
    sound(TOY_USE[id].freq, { dur: 0.25, slide: TOY_USE[id].slide });
    setPetSpeech(id === 'ball' ? 'Ball! Ball! BALL!' : to.x < from.x ? 'Links! Es fliegt nach links!' : 'Da rüber! Ich hab es!');
  }
  function toyLanded() {
    const f = flight; const card = roomRef.current;
    if (!f || !card) { if (f) toyUsePending.current.delete(f.id); setFlight(null); return; }
    const dx = ((f.to.x - 50) / 100) * card.clientWidth;
    const max = card.clientWidth * 0.3;
    setRun({ dx: Math.max(-max, Math.min(max, dx)), flip: f.to.x > 52 });
    showPetAction('run', TOY_USE[f.id].line, 2400);
    later('fetch', () => {
      setFlight(null); setRun((r) => ({ dx: 0, flip: r.flip }));
      const used = rewardToy(f.id);
      if (used) {
        const questAction = completeQuestAction(dataRef.current, `use:${f.id}`);
        if (questAction.outcome === 'completed') {
          changeWorld(questAction.data);
          notify(f.id === 'ball' ? 'Der gefundene Ball ist zurück! Die Aufgabe ist geschafft.' : 'Das Strand-Frisbee wurde geworfen! Die Aufgabe ist geschafft.');
        }
        setPetSpeech(f.kind === 'ball' ? 'Hab ihn! Nochmal?' : 'Gefangen! Noch mal werfen?');
        if (dataRef.current.evolutionStage >= 3) showPetAction('spin', 'Ein Freudesprung für uns beide!', 1900);
        later('unflip', () => setRun({ dx: 0, flip: false }), 750);
        cheer(2200);
      }
    }, 900);
  }
  function useInventoryItem(id: string) {
    const item = itemById(id);
    if (!item) return;
    if (item.type === 'toy') { setPage('home'); playToy(id); return; }
    if (item.type !== 'food') { notify('Dieser Gegenstand hat keine Benutzen-Aktion.'); return; }
    if ((dataRef.current.inventory[id] || 0) < 1) { notify('Davon ist gerade nichts im Inventar.'); return; }
    if (item.effect === 'hunger') { setPage('home'); setSelectedFood(id); performNeed('hunger', id); return; }
    if (item.effect === 'sauberkeit') { setPage('home'); performNeed('sauberkeit'); return; }
    const effects = item.effects || (item.effect ? { [item.effect]: item.amount || 0 } : {});
    const actual = Object.entries(effects).filter(([, amount]) => amount && amount > 0) as [NeedKey, number][];
    if (!actual.length) { notify('Für diesen Gegenstand ist keine Wirkung hinterlegt.'); return; }
    const hasRoom = actual.some(([need, amount]) => dataRef.current.needs[need] < 100 && amount > 0);
    if (!hasRoom) { notify('Scottchi braucht gerade keine Auffrischung.'); return; }
    setData((old) => {
      const next = {
        ...old,
        inventory: { ...old.inventory, [id]: Math.max(0, (old.inventory[id] || 0) - 1) },
        needs: applyNeeds(old.needs, effects),
        xp: old.xp + 5,
        stats: { ...old.stats, care: old.stats.care + 1 },
      };
      return recordJournal(next, `use-${id}-${Date.now()}`, '🍪', `Benutzt: ${item.name}`, item.desc || 'Scottchi hat den Gegenstand verwendet.');
    });
    showPetAction('happy', `${item.name}! Das tut gut.`);
    notify(`${item.name} benutzt.`); sound(720);
  }
  function buy(item: Item) {
    if (item.unlockLevel && level < item.unlockLevel) { notify(`Ab Level ${item.unlockLevel} freigeschaltet.`); return; }
    const stackable = item.type === 'food' || item.id === 'shampoo' || item.stackable;
    if (item.type !== 'food' && !stackable && data.owned.includes(item.id)) { notify('Das gehört schon dir.'); return; }
    if (data.coins < item.price) { notify('Noch nicht genug Münzen.'); return; }
    setData((old) => {
      if (old.coins < item.price || (item.type !== 'food' && !stackable && old.owned.includes(item.id))) return old;
      const stats = { ...old.stats, purchases: old.stats.purchases + 1 };
      let next: PetData = item.type === 'food' || (item.type === 'toy' && item.stackable)
        ? { ...old, coins: old.coins - item.price, inventory: { ...old.inventory, [item.id]: (old.inventory[item.id] || 0) + 1 }, owned: item.type === 'toy' ? [...new Set([...old.owned, item.id])] : old.owned, stats }
        : { ...old, coins: old.coins - item.price, owned: [...old.owned, item.id], stats, personality: nudge(old.personality, 'neugierig', 0.6) };
      const collectibleId = Object.entries(COLLECTION_ITEM_LINKS).find(([, linkedId]) => linkedId === item.id)?.[0];
      if (collectibleId) next = unlockArtifact(next as FullPetData, collectibleId);
      next = recordJournal(next, `buy-${item.id}-${Date.now()}`, '🛍️', `Gekauft: ${item.name}`, `${item.price} Münzen ausgegeben.`);
      return next;
    });
    notify(`${item.name} gekauft.`); sound(760);
  }
  function equip(id: string) {
    setData((old) => {
      const item = itemById(id);
      if (!item) return old;
      if (item.type === 'room') {
        if (old.roomItems.includes(id)) return { ...old, roomItems: old.roomItems.filter((v) => v !== id) };
        const index = old.roomItems.length;
        return { ...old, roomItems: [...old.roomItems, id], roomPlacements: { ...old.roomPlacements, [id]: old.roomPlacements[id] || { x: 16 + (index % 5) * 16, y: 67 + (Math.floor(index / 5) % 2) * 8 } } };
      }
      if (item.type === 'background') return { ...old, activeBackground: old.activeBackground === id ? 'classic' : id };
      if (old.equipped.includes(id)) return { ...old, equipped: old.equipped.filter((v) => v !== id) };
      const slot = SLOT_OF[id];
      // one item per slot: equipping a hat swaps the old hat, etc.
      return withStyles({ ...old, equipped: [...old.equipped.filter((v) => !slot || SLOT_OF[v] !== slot), id] });
    });
  }
  function moveDecor(event: React.PointerEvent<HTMLElement>) {
    const drag = dragDecor.current;
    const scene = roomRef.current;
    if (!drag || !scene || event.pointerId !== drag.pointerId) return;
    const bounds = scene.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(44, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100));
    setDragPosition({ id: drag.id, x, y });
  }
  function finishDecorDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragDecor.current;
    const scene = roomRef.current;
    if (!drag || !scene || event.pointerId !== drag.pointerId) return;
    const bounds = scene.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(44, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100));
    setData((old) => ({ ...old, roomPlacements: { ...old.roomPlacements, [drag.id]: { x, y } } }));
    dragDecor.current = null;
    setDragPosition(null);
  }
  function withStyles(d: PetData): PetData {
    const worn = STYLE_SETS.filter((s) => ownsAll(d.equipped, s.items) && !d.stylesWorn.includes(s.id)).map((s) => s.id);
    return worn.length ? { ...d, stylesWorn: [...d.stylesWorn, ...worn] } : d;
  }
  function wearStyle(items: string[]) {
    setData((old) => {
      if (!ownsAll(old.owned, items)) return old;
      const slots = new Set(items.map((i) => SLOT_OF[i]));
      return withStyles({ ...old, equipped: [...old.equipped.filter((v) => !slots.has(SLOT_OF[v])), ...items] });
    });
    notify('Kompletter Stil angezogen.'); sound(820);
  }
  function changeRoom(room: Room) {
    setAim(null);
    const changedRoom = dataRef.current.room !== room;
    setData((old) => ({ ...old, room, sleepUntil: room === 'Schlafzimmer' ? old.sleepUntil : null, sleepStartedAt: room === 'Schlafzimmer' ? old.sleepStartedAt : null, xp: old.xp + (old.missions.room ? 0 : 8), stats: { ...old.stats, rooms: old.stats.rooms + 1 }, missions: { ...old.missions, room: true },
      visitedRooms: old.visitedRooms.includes(room) ? old.visitedRooms : [...old.visitedRooms, room], personality: old.room === room ? old.personality : nudge(old.personality, 'neugierig', 0.4) }));
    if (changedRoom) void awardCharacterActivity('room-explore');
    sound(520);
  }
  function sleep() {
    if (data.room !== 'Schlafzimmer') { notify('Scottchi kann nur im Schlafzimmer schlafen.'); return; }
    if (sleeping) {
      setData((old) => ({ ...old, sleepUntil: null, sleepStartedAt: null, settings: { ...old.settings, lampOn: true } }));
      showPetAction('idle', 'Morgen! Was gibt es?'); notify('Scottchi ist wieder wach.'); sound(500); return;
    }
    const sleepStartedAt = Date.now();
    const sleepUntil = sleepStartedAt + 8 * 60 * 60 * 1000;
    setData((old) => ({ ...old, sleepUntil, sleepStartedAt, settings: { ...old.settings, lampOn: false }, xp: old.xp + 2, personality: nudge(old.personality, 'verschlafen', 1) }));
    setNow(Date.now() + 1);
    showPetAction('sleeping', 'Zzz…');
    notify(`${data.name} schläft jetzt acht Stunden${data.owned.includes('teddy') ? ' mit dem Teddy' : ''}.`); sound(420);
  }

  async function purchaseEvolution(): Promise<EvolutionPurchaseResult> {
    const current = dataRef.current;
    const stage = EVOLUTION_STAGES[current.evolutionStage];
    if (!stage) return { ok: false, reason: 'complete' };
    if (!onlineUserId || cloudLinkRef.current?.userId !== onlineUserId) {
      return { ok: false, reason: 'account', message: 'Verknüpfe zuerst dein Online-Konto.' };
    }
    if (!await syncCloudBeforeEconomy()) {
      return { ok: false, reason: 'sync', message: 'Der Spielstand konnte vor dem Kauf nicht sicher synchronisiert werden.' };
    }
    const actionKey = 'evolution-purchase';
    const result = await withChestAction(actionKey, async () => {
      try {
        const response = await purchaseOnlineEvolution.mutateAsync({ data: { requestId: requestIdFor(actionKey) } });
        const serverSnapshot = normalize(response.saveData as Partial<PetData>);
        const latest = dataRef.current;
        const localCoinDelta = latest.coins - current.coins;
        const completedStage = EVOLUTION_STAGES[serverSnapshot.evolutionStage - 1];
        if (!completedStage) throw new Error('Der Server lieferte eine ungültige Evolutionsstufe.');
        let updated: PetData = {
          ...latest,
          coins: Math.max(0, serverSnapshot.coins + localCoinDelta),
          evolutionStage: serverSnapshot.evolutionStage,
          activeEvolutionStage: serverSnapshot.activeEvolutionStage,
          owned: [...new Set([...latest.owned, ...serverSnapshot.owned])],
          characterPoints: serverSnapshot.characterPoints,
          characterDaily: serverSnapshot.characterDaily,
          characterProgressVersion: 1,
        };
        updated = recordJournal(
          updated,
          `evolution-stage-${completedStage.stage}`,
          '✦',
          `Entwicklung: ${completedStage.name}`,
          `${completedStage.coinCost.toLocaleString('de-DE')} Münzen · ${completedStage.reward}`,
        );
        dataRef.current = updated;
        setData(updated);
        linkCloudToCurrentSave(response.revision, serverSnapshot);
        queryClient.setQueryData(getGetOnlineSaveQueryKey(), (saved) => saved
          ? { ...saved, saveData: response.saveData, revision: response.revision, updatedAt: response.updatedAt }
          : saved);
        chestRequestIds.current.delete(actionKey);
        notify(`Scottchi ist jetzt ${completedStage.name}!`);
        return { ok: true as const, data: updated, stage: completedStage };
      } catch (error) {
        const message = serverActionError(error);
        const reason: 'level' | 'traits' | 'coins' | 'complete' | 'sync' = message.toLocaleLowerCase('de-DE').includes('level') ? 'level'
          : message.toLocaleLowerCase('de-DE').includes('charakterzüge') ? 'traits'
            : message.toLocaleLowerCase('de-DE').includes('münzen') ? 'coins'
              : message.toLocaleLowerCase('de-DE').includes('alle evolutionsstufen') ? 'complete'
                : 'sync';
        return { ok: false as const, reason, message };
      }
    });
    return result || { ok: false, reason: 'sync', message: 'Die Evolutionsanfrage läuft bereits.' };
  }
  function selectEvolutionForm(stage: number) {
    const current = dataRef.current;
    const updated = selectUnlockedEvolution(current, stage);
    if (!updated || stage === current.activeEvolutionStage) return;
    dataRef.current = updated;
    setData(updated);
    notify(`Aktive Form: ${EVOLUTION_STAGES[stage - 1].name}.`);
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify({ ...data, lastUpdated: Date.now() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'tamascottchi-save.json'; link.click(); URL.revokeObjectURL(link.href); notify('Spielstand exportiert.');
  }
  function importSave() {
    try {
      const value: unknown = JSON.parse(fileText);
      assertSave(value);
      if (!Number.isFinite(value.coins) || !Number.isFinite(value.xp)) throw new Error('invalid');
      setData(normalize(value)); setModal(null); setFileText(''); notify('Spielstand geladen.');
    } catch { notify('Datei ist kein gültiger tamascottchi-Spielstand.'); }
  }
  function resetGame() {
    localStorage.removeItem(STORE_KEY);
    if (onlineUserId) localStorage.removeItem(`tamascottchi-cloud-link:${onlineUserId}`);
    setCloudLink(null);
    setCloudSyncStatus(onlineUserId ? 'unlinked' : 'offline');
    setData(initialData());
    setPage('home');
    setActiveGame(null);
    setModal(null);
    notify(onlineUserId ? 'Neuer lokaler Spielstand gestartet. Die Cloud-Sicherung bleibt unverändert.' : 'Neuer Spielstand gestartet.');
  }

  const nav = [
    { id: 'home', label: 'Zuhause', icon: Home }, { id: 'world', label: 'World', icon: Compass },
    { id: 'inventory', label: 'Inventar', icon: Backpack }, { id: 'crafting', label: 'Werkstatt', icon: Hammer },
    { id: 'journal', label: 'Tagebuch', icon: BookOpen }, { id: 'help', label: 'Hilfe', icon: CircleHelp },
    { id: 'games', label: 'Spiele', icon: Gamepad2 }, { id: 'shop', label: 'Laden', icon: ShoppingBag },
    { id: 'collections', label: 'Sammeln', icon: Library }, { id: 'online', label: 'Online', icon: Users },
    { id: 'closet', label: 'Schrank', icon: Shirt }, { id: 'leaderboard', label: 'Besten', icon: Trophy },
    { id: 'achievements', label: 'Erfolge', icon: Award },
  ];
  const uniqueOwned = new Set(data.owned).size;
  const stylesOwned = STYLE_SETS.filter((s) => ownsAll(data.owned, s.items)).length;
  const missions = DAILY_GOALS.map((goal) => ({ ...goal, progress: Math.min(data.daily[goal.id], goal.target), done: data.missions[goal.id] || false, reward: `+${goal.rewardCoins} Münzen · +${goal.rewardXp} XP` }));
  const achievements = [
    ...[
      { id: 'first-game', title: 'Pfoten in Bewegung', detail: 'Schließe dein erstes Spiel ab', progress: data.stats.games, goal: 1, icon: '✦', rewardCoins: 12, rewardXp: 10 },
      { id: 'ten-games', title: 'Spielplatz-Stammgast', detail: 'Spiele insgesamt 10 Runden', progress: data.stats.games, goal: 10, icon: '▦', rewardCoins: 30, rewardXp: 20 },
      { id: 'careful', title: 'Gute Pfote', detail: 'Kümmere dich 5-mal um Scottchi', progress: data.stats.care, goal: 5, icon: '♥', rewardCoins: 16, rewardXp: 12 },
      { id: 'collector', title: 'Kleiner Sammler', detail: 'Kaufe 3 Dinge im Laden', progress: data.stats.purchases, goal: 3, icon: '◇', rewardCoins: 18, rewardXp: 12 },
      { id: 'room-hop', title: 'Zimmerreise', detail: 'Wechsle 5-mal den Raum', progress: data.stats.rooms, goal: 5, icon: '⌂', rewardCoins: 14, rewardXp: 12 },
      { id: 'snack', title: 'Snack-Spezialist', detail: 'Fang 25 Snacks', progress: data.stats.catches, goal: 25, icon: '●', rewardCoins: 22, rewardXp: 16 },
      { id: 'toybox', title: 'Spielkamerad', detail: 'Spiele 15-mal mit Spielzeug', progress: data.stats.toys || 0, goal: 15, icon: '◎', rewardCoins: 20, rewardXp: 15 },
      { id: 'level-10', title: 'Großer Scottchi', detail: 'Bring Scottchi auf Level 10', progress: level, goal: 10, icon: '★', rewardCoins: 80, rewardXp: 0 },
      { id: 'own-25', title: 'Schatzkammer', detail: 'Besitze 25 verschiedene Gegenstände', progress: uniqueOwned, goal: 25, icon: '◆', rewardCoins: 70, rewardXp: 40 },
      { id: 'games-100', title: 'Arcade-Legende', detail: 'Schließe 100 Minispiele ab', progress: data.stats.games, goal: 100, icon: '▲', rewardCoins: 90, rewardXp: 60 },
      { id: 'full-style', title: 'Stilsicher', detail: 'Sammle alle Teile eines Outfit-Stils', progress: stylesOwned > 0 ? 1 : 0, goal: 1, icon: '✧', rewardCoins: 35, rewardXp: 25 },
      { id: 'all-rooms', title: 'Hausrundgang', detail: `Besuche alle ${ROOM_LIST.length} Räume`, progress: data.visitedRooms.length, goal: ROOM_LIST.length, icon: '⌂', rewardCoins: 20, rewardXp: 15 },
    ].map((achievement) => ({ ...achievement, rewardSummary: `${achievement.rewardCoins} Münzen · ${achievement.rewardXp} XP` })),
    ...PLAYER_LEVEL_MILESTONES.map((milestone) => {
      const rewardParts = [
        milestone.rewardCoins ? `${milestone.rewardCoins} Münzen` : '',
        milestone.rewardMaterials?.map(({ id, quantity }) => `${quantity} ${id}`).join(', ') || '',
        milestone.rewardChest ? `${CHEST_DEFINITIONS[milestone.rewardChest].label}-Kiste` : '',
        milestone.rewardRoomItem ? itemById(milestone.rewardRoomItem)?.name || 'exklusive Dekoration' : '',
        milestone.playerTitle ? `Titel „${milestone.playerTitle}“` : '',
      ].filter(Boolean);
      return {
        id: milestone.id, title: milestone.title, detail: milestone.description, progress: level, goal: milestone.level,
        icon: '🐾', rewardCoins: milestone.rewardCoins || 0, rewardXp: 0, rewardSummary: rewardParts.join(' · '),
      };
    }),
  ];
  const collections = COLLECTIONS.map((c) => ({ ...c, have: c.items.filter((i) => data.owned.includes(i)).length }));
  function claimCollection(id: string) {
    const c = collections.find((x) => x.id === id);
    if (!c || c.have < c.items.length || data.claimedAchievements.includes(id)) return;
    setData((old) => old.claimedAchievements.includes(id) ? old : advanceDaily({ ...old, coins: old.coins + c.rewardCoins, xp: old.xp + c.rewardXp, claimedAchievements: [...old.claimedAchievements, id] }, 'coins', c.rewardCoins));
    notify(`Sammlung ${c.name} komplett: +${c.rewardCoins} Münzen.`); sound(880);
  }
  function upgradeCollectedArtifact(id: string) {
    const result = upgradeArtifact(dataRef.current, id);
    if (!result.ok) {
      notify(result.reason === 'not-enough-coins' ? 'Für dieses Upgrade fehlen Münzen.'
        : result.reason === 'not-enough-materials' ? 'Für dieses Upgrade fehlen noch Materialien.'
          : result.reason === 'max-level' ? 'Dieses Artefakt ist bereits auf Maximallevel.' : 'Dieses Artefakt ist noch nicht entdeckt.');
      return;
    }
    dataRef.current = result.data;
    setData(result.data);
    notify(`Artefakt auf Stufe ${result.newLevel} verbessert.`);
    sound(result.newLevel % 5 === 0 ? 1180 : 880, { dur: .2, slide: 1320 });
  }
  function toggleArtifactEquipment(id: string) {
    const result = equipArtifact(dataRef.current, id, levelFor(dataRef.current.xp));
    if (!result.ok) {
      notify(result.reason === 'slots-full' ? 'Alle Artefaktplätze sind belegt.' : 'Dieses Artefakt wurde noch nicht entdeckt.');
      return;
    }
    dataRef.current = result.data;
    setData(result.data);
    notify(result.data.equippedArtifacts.includes(id) ? 'Artefakt ausgerüstet.' : 'Artefakt abgelegt.');
  }
  function changeWorld(next: FullPetData) {
    setData((old) => advanceDaily(next, 'coins', Math.max(0, next.coins - old.coins)));
    void awardCharacterActivity('world-discovery');
  }
  function craft(recipeId: string, quantity: number) {
    const result = craftItem(dataRef.current, recipeId, quantity);
    if (result.error) { notify(result.error); return; }
    dataRef.current = result.data;
    setData(result.data);
    const entry = result.data.journal[result.data.journal.length - 1];
    notify(entry?.title || `${quantity} Gegenstände hergestellt.`);
    sound(860, { dur: .22, slide: 1160 });
  }
  function claimWorldReward(id:string,_name:string,coins:number,xp:number) {
    setData(old=>old.world.claimedRewards.includes(id)?old:advanceDaily({...old,coins:old.coins+coins,xp:old.xp+xp,world:{...old.world,claimedRewards:[...old.world.claimedRewards,id]}},'coins',coins));
    notify('Einmalige Sammlungsbelohnung abgeholt.');sound(880);
  }
  function claimAchievement(id: string) {
    const a = achievements.find((item) => item.id === id);
    if (!a || a.progress < a.goal || data.claimedAchievements.includes(id)) return;
    const milestone = PLAYER_LEVEL_MILESTONES.find((item) => item.id === id);
    setData((old) => {
      if (old.claimedAchievements.includes(id)) return old;
      let next: FullPetData = {
        ...old,
        coins: old.coins + a.rewardCoins,
        xp: old.xp + a.rewardXp,
        claimedAchievements: [...old.claimedAchievements, id],
      };
      if (milestone?.rewardMaterials?.length) {
        const inventory = { ...next.inventory };
        for (const material of milestone.rewardMaterials) inventory[material.id] = (inventory[material.id] || 0) + material.quantity;
        next = { ...next, inventory };
      }
      if (milestone?.rewardRoomItem) next = { ...next, owned: [...new Set([...next.owned, milestone.rewardRoomItem])] };
      if (milestone?.rewardChest) next = grantMilestoneChest(next, id, milestone.rewardChest, Date.now());
      return advanceDaily(next, 'coins', a.rewardCoins);
    });
    notify(`Erfolg abgeholt: ${a.rewardSummary}.`);
  }
  const roomDecor = data.roomItems.map(itemById).filter(Boolean) as Item[];
  const ownedToys = Object.keys(TOY_USE).filter((id) => (data.inventory[id] || 0) > 0);
  const bgKey = data.activeBackground === 'classic' ? ROOM_BG[data.room] : undefined;
  const bg = bgKey ? BACKGROUNDS[bgKey] : null;
  const backgroundArt = data.activeBackground === 'classic' ? undefined : itemById(data.activeBackground)?.img;
  const currentGame = GAMES.find((g) => g.id === activeGame);
  const teddyBeside = data.owned.includes('teddy') && data.room === 'Schlafzimmer';
  const speech = sleeping ? (teddyBeside ? 'Zzz… *kuschelt den Teddy*' : 'Zzz…') : mood === 'hungry' ? 'Bro, ich hab Hunger.' : mood === 'tired' ? 'Ich bin so müde.' : mood === 'dirty' ? 'Ich rieche… interessant.' : mood === 'sad' ? 'Spielst du mit mir?' : petSpeech;
  const ownedOf = (type: Item['type']) => data.owned.filter((id) => {
    const item = itemById(id);
    return item?.type === type && (type !== 'toy' || !TOY_USE[id] || (data.inventory[id] || 0) > 0);
  });

  const scene = <section
    ref={roomRef}
    onPointerMove={moveDecor}
    onPointerUp={finishDecorDrag}
    onPointerCancel={finishDecorDrag}
    className={`room-card phase-${phase} ${bg ? 'has-photo' : `room-${data.room.toLowerCase()} background-${data.activeBackground}`} ${data.room === 'Schlafzimmer' && !data.settings.lampOn ? 'room-dark' : ''} ${data.room === 'Schlafzimmer' && (phase === 'abend' || phase === 'nacht') ? 'room-cozy' : ''}`}
    style={bg ? { ['--bg-pos' as string]: bg.pos, ['--bg-pos-m' as string]: bg.mobilePos } : undefined} data-testid="room-scene">
    {bg ? <picture key={bgKey} className="room-photo"><source srcSet={bg.src} type="image/webp"/><img src={bg.fallback} alt=""/></picture>
      : <><div key={data.room + data.activeBackground} className="room-css"><div className="room-sky"/><div className="room-floor"/><div className="room-window"/><div className="room-art">W</div><div className="rug"/></div>
        {backgroundArt && <div className="room-theme-art" aria-hidden="true"><img src={backgroundArt} alt="" /></div>}</>}
    {roomDecor.map((item, i) => {
      const pos = dragPosition?.id === item.id ? dragPosition : data.roomPlacements[item.id] || { x: 16 + (i % 5) * 16, y: 70 };
      return <button className="room-item" key={item.id} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} title={`${item.name} · zum Verschieben ziehen`} aria-label={`${item.name} verschieben`} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); dragDecor.current = { id: item.id, pointerId: event.pointerId }; }} onPointerUp={finishDecorDrag} onPointerCancel={finishDecorDrag} data-testid={`room-decor-${item.id}`}>{hasMaterialArt(item) ? <MaterialArt item={item} size={42}/> : item.img ? <img src={item.img} alt=""/> : item.icon}</button>;
    })}
    {data.owned.includes('bowl') && <img src={itemById('bowl')!.img} alt="Futternapf" className="scene-bowl"/>}
    <div className="room-badge">{data.room}</div>
    <div className="pet-speech" key={speech} data-testid="text-pet-speech">{speech}</div>
    {data.room === 'Schlafzimmer' && <button className="button small room-light" onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, lampOn: !old.settings.lampOn } }))} data-testid="button-bedroom-light">{data.settings.lampOn ? 'Licht aus' : 'Licht an'}</button>}
    <div className="room-phase" data-testid="status-day-phase">{phase === 'morgen' || phase === 'tag' ? <Sun size={13}/> : phase === 'abend' ? <Sunset size={13}/> : <Moon size={13}/>}{PHASE_INFO[phase].name}</div>
    {teddyBeside && <img src={itemById('teddy')!.img} alt="Teddy am Schlafplatz" className={`scene-teddy ${sleeping ? 'is-snuggled' : ''}`} data-testid="img-teddy-bed"/>}
    <div className="pet-anchor">
      <div className={`pet-runner ${run.flip ? 'flip' : ''}`} style={{ transform: `translateX(${run.dx}px)` }}>
        <div className="pet-facing">
          <Scottchi mood={mood} equipped={data.equipped} action={petAction} sleeping={sleeping} onTap={pet} idle={idleStyle} formStage={data.activeEvolutionStage}/>
          {chewing && <img src={itemById('bone-toy')!.img} alt="" className="chew-bone" data-testid="img-chew-bone"/>}
        </div>
        {petAction === 'washing' && <div className="bubbles" aria-hidden><i/><i/><i/><i/><i/></div>}
        {petAction === 'eating' && <div className="crumbs" aria-hidden><i/><i/><i/><i/></div>}
        {sleeping && <div className="zzz" aria-hidden><i>z</i><i>z</i><i>Z</i></div>}
      </div>
    </div>
    {toyFx && <img key={toyFx.key} src={itemById(toyFx.id)?.img} alt="" className={`toy-fx fx-${toyFx.fx}`}/>}
    {flight && <FlyingToy key={flight.key} t={flight} duration={flight.kind === 'ball' ? 850 : 1000} onLand={toyLanded}/>}
    {aim && <AimLayer kind={aim} onThrow={(f, t) => throwToy(aim, f, t)} onCancel={() => setAim(null)}/>}
    {ownedToys.length > 0 && <div className="toy-tray" aria-label="Spielzeug benutzen">{ownedToys.map((id) => { const it = itemById(id)!; const locked = !!TOY_USE[id].room && TOY_USE[id].room !== data.room; const quantity = data.inventory[id] || 0; const fun = TOY_USE[id].need.glueck || 0; return <button key={id} className={`toy-btn ${locked ? 'locked' : ''} ${aim === id ? 'aiming' : ''}`} onClick={() => playToy(id)} title={`${it.name} · Bestand ${quantity} · +${fun} Laune · wird bei Benutzung verbraucht`} aria-label={`${it.name}, Bestand ${quantity}, plus ${fun} Laune, wird bei Benutzung verbraucht`} data-testid={`button-toy-${id}`}><img src={it.img} alt=""/><small className="toy-count">×{quantity}</small></button>; })}</div>}
    <div className="room-controls">{ROOM_LIST.map((room) => <button key={room} className={`room-chip ${data.room === room ? 'selected' : ''}`} onClick={() => changeRoom(room)} data-testid={`room-${room.toLowerCase()}`}>{room}</button>)}</div>
  </section>;

  return <div className={`app-shell ${activeGame ? 'in-game' : ''}`}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark">t</span>tamascottchi <span className="version-pill">6.2</span></div>
      <div className="topstats">
        <div className="stat-pill" data-testid="status-coins"><Coins size={16}/>{data.coins}</div>
        <div className="stat-pill" data-testid="status-level"><Star size={15}/><span>Lv. {level}</span></div>
        <button className="stat-pill" aria-label="Einstellungen" onClick={() => setModal('settings')} data-testid="button-settings"><Settings size={16}/></button>
      </div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        <div className="nav-card"><div className="nav-label">DEIN KLEINES UNIVERSUM</div><div className="nav-list">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setActiveGame(null); }} className={`nav-button ${page === id ? 'active' : ''}`} data-testid={`nav-${id}`}><Icon/>{label}</button>)}</div></div>
        <div className="side-note"><strong>Level {level} · {playerTitle}</strong><div className="progress-track"><span style={{ width: `${xpProgress}%` }}/></div><div style={{ marginTop: 7 }}>{levelProgress.isMaxLevel ? 'Maximallevel erreicht' : `${levelProgress.earned} / ${levelProgress.required} XP bis zum nächsten Level`}</div></div>
      </aside>
      <main className="main">
        {!activeGame && page !== 'online' && <div className="main-head"><div><div className="eyebrow">{page === 'home' ? 'DEIN ZUHAUSE' : 'TAMASCOTTCHI 6.2'}</div><h1>{page === 'home' ? `Hallo, ${data.name}.` : page === 'shop' ? 'Der kleine Laden' : page === 'world' ? 'Scottchi World' : page === 'collections' ? 'Scottchi Collections' : page === 'games' ? 'Spielzeit!' : page === 'closet' ? 'Kleiderschrank' : page === 'leaderboard' ? 'Bestenliste' : page === 'inventory' ? 'Inventar' : page === 'crafting' ? 'Werkstatt' : page === 'journal' ? 'Scottchis Tagebuch' : page === 'help' ? 'Hilfe & Spielstart' : 'Erfolge'}</h1><div className="subline">{page === 'home' ? 'Tippe Scottchi an, wirf Spielzeug, wechsle das Zimmer.' : page === 'leaderboard' ? 'Nur deine Ergebnisse auf diesem Gerät.' : 'Ein gemütlicher Ort für Scottchi und dich.'}</div></div>
          {page === 'home' && <button className="button small" onClick={() => { setNameDraft(data.name); setModal('name'); }} data-testid="button-rename">Name ändern</button>}
        </div>}

        {page === 'home' && <>
          <div className="hero-grid">
            {scene}
            <section className="panel need-panel">
              <div className="panel-head"><h2 className="panel-title">{data.name}s Wohlgefühl</h2><span className={`mood-tag mood-${mood}`} data-testid="status-mood">{({ default: 'Entspannt', happy: 'Glücklich', hungry: 'Hungrig', tired: 'Müde', dirty: 'Schmutzig', sad: 'Traurig', excited: 'Aufgedreht' } as const)[mood]}</span></div>
              <div className="routine-strip" data-testid="routine-strip"><strong>{PHASE_INFO[phase].name}</strong><span>{PHASE_INFO[phase].tip}</span></div>
              {NEEDS.map(({ id, name, icon: Icon }) => {
                const value = id === 'zuneigung' ? clamp(data.personality.anhaenglich) : data.needs[id];
                return <div className="need-row" key={id} data-testid={`need-${id}`} title={id === 'zuneigung' ? 'Zuneigung wächst durch regelmäßiges Füttern, Baden und Kraulen.' : undefined}>
                  <div className="need-icon"><Icon/></div><div><div className="need-label">{name}</div><div className="meter"><div className={`meter-fill ${id !== 'zuneigung' && value < 30 ? 'low' : id !== 'zuneigung' && value < 55 ? 'mid' : ''}`} style={{ transform: `scaleX(${value / 100})` }}/></div></div><div className="need-value">{Math.round(value)}%</div>
                </div>;
              })}
              {data.room === 'Küche' && <div className="room-controls" style={{ position: 'static', flexWrap: 'wrap', margin: '0 0 3px' }} aria-label="Futter auswählen">
                {ITEMS.filter((item) => item.type === 'food' && item.effect === 'hunger').map((item) => <button key={item.id} className={`room-chip food-choice-chip ${selectedFood === item.id ? 'selected' : ''}`} disabled={!data.inventory[item.id]} onClick={() => setSelectedFood(item.id)} data-testid={`food-choice-${item.id}`}>{item.img && <img src={item.img} alt="" loading="lazy"/>}{item.name} · {data.inventory[item.id] || 0}</button>)}
              </div>}
              <div className="pet-actions">
                <button className="action-button" onClick={() => performNeed('hunger')} disabled={data.needs.hunger >= 100 || !ITEMS.some((item) => item.effect === 'hunger' && (data.inventory[item.id] || 0) > 0)} data-testid="button-feed"><Utensils/>Füttern · {data.inventory[selectedFood] || 0}</button>
                <button className="action-button" onClick={() => performNeed('glueck')} data-testid="button-play-care"><Dumbbell/>Toben</button>
                <button className="action-button" onClick={() => performNeed('sauberkeit')} data-testid="button-bath"><Bath/>Baden {data.inventory.soap ? `· ${data.inventory.soap}` : ''}</button>
                <button className="action-button" onClick={pet} data-testid="button-cuddle"><Heart/>Kraulen</button>
                {data.room === 'Schlafzimmer' && <button className="action-button" onClick={sleep} data-testid="button-sleep"><Moon size={15}/>{sleeping ? 'Aufwachen' : 'Schlafen · 8 Std.'}</button>}
              </div>
              {!ownedToys.length && <p className="subline">Spielzeug aus dem Laden erscheint direkt im Zimmer und lässt sich antippen.</p>}
              <div className="traits" data-testid="panel-personality">
                <div className="traits-head"><strong>Entwicklung zur nächsten Form</strong><span>{nextEvolution ? `${evolutionProgressPercent}%` : 'Maximum erreicht'}</span></div>
                {TRAITS.map((t) => {
                  const value = data.characterPoints[t.id];
                  const complete = value >= traitRequirement;
                  const percent = traitRequirement ? Math.min(100, value / traitRequirement) : 1;
                  return <div key={t.id} className={`trait-row ${complete ? 'lead met' : ''}`} title={t.hint} data-testid={`trait-${t.id}`}>
                    <span className="trait-label">{t.name}<small>{value.toLocaleString('de-DE')} / {traitRequirement.toLocaleString('de-DE')}</small></span>
                    <div className="trait-bar"><i style={{ transform: `scaleX(${percent})` }}/></div>
                  </div>;
                })}
                <div className="character-daily-progress" data-testid="character-daily-progress">
                  <div><strong>Heutige Charakterpunkte</strong><span>{characterDaily.earned}/{CHARACTER_DAILY_POINT_CAP} · noch {CHARACTER_DAILY_POINT_CAP - characterDaily.earned}</span></div>
                  <div className="trait-bar"><i style={{ transform: `scaleX(${characterDaily.earned / CHARACTER_DAILY_POINT_CAP})` }}/></div>
                  <small>Limit für alle Züge zusammen · Reset um Mitternacht (Europe/Berlin)</small>
                </div>
                <p className="character-evolution-progress" data-testid="evolution-progress-summary">
                  {nextEvolution ? `${evolutionProgressPercent}% bis ${nextEvolution.name} · ${nextEvolution.traitPointsRequired.toLocaleString('de-DE')} je Charakterzug` : 'Alle zehn Formen freigeschaltet.'}
                </p>
                {!characterProgressLinked && nextEvolution && <button className="text-link character-account-link" onClick={() => setPage('online')} data-testid="link-character-account">Online-Konto verknüpfen, um Charakterpunkte zu sammeln</button>}
                <button className="text-link evolution-home-link" onClick={() => { setPage('closet'); setClosetTab('evolution'); }} data-testid="link-evolution">Form {data.activeEvolutionStage} · {data.evolutionStage}/10 freigeschaltet</button>
              </div>
            </section>
          </div>
          <div className="section-grid">
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Heute für euch</h2><Gift size={18}/></div><div className="mission-list">{missions.map((m) => <div className="mission" key={m.id} data-testid={`mission-${m.id}`}><div className={`mission-check ${m.done ? 'done' : ''}`}>{m.done && <Check/>}</div><div><div className="mission-title">{m.title}</div><div className="mission-progress">{m.done ? 'Für heute erledigt' : `${m.progress} / ${m.target} · ${m.detail}`}</div></div><span className="reward">{m.done ? 'Erledigt' : m.reward}</span></div>)}</div></section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Eine Runde?</h2><button className="text-link" onClick={() => setPage('games')} data-testid="link-all-games">Alle Spiele</button></div><div className="game-list">{GAMES.slice(0, 4).map((g) => <button key={g.id} className="game-tile" onClick={() => openGame(g.id)} data-testid={`start-${g.id}`}><span className="game-name">{g.name}</span><span className="game-desc">{g.desc}</span><span className="game-best">Best {data.highscores[g.id] || 0}</span></button>)}</div></section>
          </div>
          {!data.tutorialSeen && <section className="panel tutorial-card" data-testid="tutorial-card"><div className="panel-head"><div><div className="eyebrow">DEIN ERSTER TAG</div><h2 className="panel-title">So geht’s los</h2></div><Sparkles size={18}/></div><p>Versorge Scottchi, sammle Materialien bei den Weltaufgaben und stelle daraus in der Werkstatt neue Dinge her. Inventar und Tagebuch halten deine Funde fest.</p><div className="dialog-actions"><button className="button" onClick={() => { setPage('help'); setData((old) => ({ ...old, tutorialSeen: true })); }}>Kurze Hilfe öffnen</button><button className="button ghost" onClick={() => setData((old) => ({ ...old, tutorialSeen: true }))}>Verstanden</button></div></section>}
        </>}

        {page === 'world' && <World data={data} level={level} serverClockOffsetMs={serverClockOffsetMs} onChange={changeWorld} onNotice={notify} onStore={(tab) => { setShopTab(tab); setPage('shop'); }} onClaimDailyChest={onlineUserId && cloudLink?.userId === onlineUserId ? claimDailyWorldChest : undefined}/>}
        {page === 'collections' && <CollectionsPage data={data} playerLevel={level} economySecured={!!onlineUserId && cloudLink?.userId === onlineUserId} onClaim={claimWorldReward} onUpgradeArtifact={upgradeCollectedArtifact} onToggleArtifact={toggleArtifactEquipment} onOpenChest={openChestFromCollection}/>}
        {page === 'inventory' && <InventoryPage data={data} onUse={useInventoryItem} onEquip={equip} onPlace={equip} onOpenChest={openChest}/>}
        {page === 'crafting' && <CraftingPage data={data} onCraft={craft}/>}
        {page === 'journal' && <JournalPage data={data}/>}
        {page === 'help' && <HelpPage/>}
        {page === 'online' && <OnlinePage localSave={data} onRestoreCloud={restoreCloudSave} onCloudLinked={linkCloudToCurrentSave} syncStatus={cloudSyncStatus}/>}
        {page === 'games' && (activeGame && currentGame
          ? <GameStage key={`${activeGame}-${memoryPairs}-${cupLevel}`} id={activeGame} name={currentGame.name} rules={currentGame.rules} best={data.highscores[activeGame] || 0}
              difficulty={activeGame === 'memory' ? memoryPairs : activeGame === 'bone' ? cupLevel : undefined} extras={data.owned}
              sound={sound} onRequestStart={requestStart} onComplete={completeGame} onOpenChest={openChest} onExit={() => setActiveGame(null)}/>
          : <div className="page-grid">
            <section className="panel minigame-daily-panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-head"><h2 className="panel-title">Deine Minispiel-Tagesbelohnungen</h2><span className="stat-pill">Reset 00:00 · Europe/Berlin</span></div>
              <p className="subline">Wiederholbare Runden teilen sich ein tägliches XP- und Münzlimit. Aufgaben, Challenges und Meilensteine bleiben davon unberührt.</p>
              <div className="minigame-economy-grid">
                <div className="minigame-economy-stat"><strong><Star size={15}/> XP aus Minispielen</strong><span>{minigameDaily.xp.toLocaleString('de-DE')} / {MINIGAME_DAILY_XP_CAP.toLocaleString('de-DE')}</span><div className="meter"><div className="meter-fill" style={{ width: `${Math.min(100, minigameDaily.xp / MINIGAME_DAILY_XP_CAP * 100)}%` }}/></div><small>{Math.max(0, MINIGAME_DAILY_XP_CAP - minigameDaily.xp).toLocaleString('de-DE')} XP übrig</small></div>
                <div className="minigame-economy-stat"><strong><Coins size={15}/> Münzen aus Minispielen</strong><span>{minigameDaily.coins.toLocaleString('de-DE')} / {minigameCoinCap.toLocaleString('de-DE')}</span><div className="meter"><div className="meter-fill" style={{ width: `${Math.min(100, minigameDaily.coins / minigameCoinCap * 100)}%` }}/></div><small>{Math.max(0, minigameCoinCap - minigameDaily.coins).toLocaleString('de-DE')} Münzen übrig</small></div>
                <div className="minigame-economy-stat"><strong><Target size={15}/> Tagesaufgaben</strong><span>{completedMinigameTasks} / {GAMES.length} abgeschlossen</span><small>Jedes Minispiel hat eigenen Fortschritt und eine eigene Kiste.</small></div>
                <div className="minigame-economy-stat"><strong><Gift size={15}/> Kisten abgeholt</strong><span>{minigameDaily.claimed.length} / {GAMES.length} heute</span><small>Kisten müssen aktiv abgeholt werden; maximal eine je Spiel und Tag.</small></div>
              </div>
              <p className="minigame-chest-odds"><strong>Kisten-Chancen auf Level {level}:</strong> {CHEST_TIERS.map((tier) => `${CHEST_DEFINITIONS[tier].label.replace(' Kiste', '')} ${minigameDailyChestChances(level)[tier]}%`).join(' · ')}</p>
              <p className="minigame-chest-odds">Schlüsselpreise im Laden passen sich deinem Level an. Das tägliche Minispiel-Limit gilt nicht für einmalige Belohnungen.</p>
            </section>
            {GAMES.map((g) => {
              const progress = minigameDaily.taskPoints[g.id] || 0;
              const claimed = minigameDaily.claimed.includes(g.id);
              const complete = progress >= MINIGAME_DAILY_TASK_TARGET;
              return <article className="panel game-card2" key={g.id} data-testid={`game-card-${g.id}`}>
            <div className="panel-head"><h2 className="panel-title">{g.name}</h2><span className="best-badge"><Trophy size={13}/> {data.highscores[g.id] || 0}</span></div>
            <p className="subline" style={{ minHeight: 32 }}>{g.desc}</p>
            {g.id === 'memory' && <div className="memory-difficulty">{[6, 8, 12].map((p) => <button key={p} className={`room-chip ${memoryPairs === p ? 'selected' : ''}`} onClick={() => setMemoryPairs(p)} data-testid={`memory-difficulty-${p}`}>{p === 6 ? 'Leicht' : p === 8 ? 'Mittel' : 'Schwer'} · {p}</button>)}</div>}
            {g.id === 'bone' && <div className="memory-difficulty">{['Leicht', 'Mittel', 'Schwer'].map((l, i) => <button key={l} className={`room-chip ${cupLevel === i ? 'selected' : ''}`} onClick={() => setCupLevel(i)} data-testid={`cups-difficulty-${i}`}>{l}</button>)}</div>}
            <div className="challenge-mini">{CHALLENGES.filter((c) => c.game === g.id).map((c) => <span key={c.id} className={data.challenges[c.id] ? 'done' : ''}><Target size={12}/> {c.title}</span>)}</div>
            <div className="minigame-task">
              <div className="minigame-task-head"><strong>Tagesaufgabe</strong><span>{claimed ? 'Kiste abgeholt' : `${progress} / ${MINIGAME_DAILY_TASK_TARGET} Punkte`}</span></div>
              <div className="meter"><div className="meter-fill" style={{ width: `${Math.min(100, progress / MINIGAME_DAILY_TASK_TARGET * 100)}%` }}/></div>
              <small>{claimed ? 'Neue Aufgabe morgen um Mitternacht.' : complete ? 'Fertig — deine Kiste wartet.' : 'Starke Runden bringen mehr Aufgabenpunkte.'}</small>
            </div>
            <div className="minigame-card-actions">
              {complete && !claimed && <button className="button orange" onClick={() => void claimMinigameDailyChestAction(g.id)} disabled={pendingMinigameClaim !== null} data-testid={`button-claim-minigame-chest-${g.id}`}><Gift size={14}/>{pendingMinigameClaim === g.id ? 'Wird abgeholt …' : 'Tageskiste abholen'}</button>}
              {claimed && <span className="minigame-claimed"><Check size={14}/> Heute abgeholt</span>}
              <button className="button" onClick={() => setActiveGame(g.id)} data-testid={`button-start-${g.id}`}><Play size={14}/> Spielen</button>
            </div>
          </article>;
            })}
          </div>)}

        {page === 'shop' && <section className="panel"><div className="panel-head"><h2 className="panel-title">Ein paar gute Dinge</h2><span className="stat-pill"><Coins size={14}/>{data.coins}</span></div><div className="room-controls" style={{ position: 'static', margin: '0 0 14px', flexWrap: 'wrap' }}>{(['food', 'toy', 'accessory', 'room', 'background', 'keys'] as const).map((tab) => <button className={`room-chip ${shopTab === tab ? 'selected' : ''}`} key={tab} onClick={() => setShopTab(tab)} data-testid={`shop-tab-${tab}`}>{tab === 'food' ? 'Futter & Pflege' : tab === 'toy' ? 'Spielzeug' : tab === 'accessory' ? 'Kleidung & Hüte' : tab === 'room' ? 'Zimmer' : tab === 'background' ? 'Hintergründe' : 'Schlüssel'}</button>)}</div>
          {shopTab === 'keys' ? <div className="page-grid">{CHEST_TIERS.map((tier) => { const price = chestKeyPrice(tier, level); return <div className="shop-item" key={tier} data-testid={`shop-key-${tier}`}><span className={`item-icon chest-key-icon rarity-${tier}`}><KeyRound size={24}/></span><div className="item-info"><div className="item-title">{CHEST_DEFINITIONS[tier].label}-Schlüssel</div><div className="item-meta">{data.world.keys[tier] || 0} vorhanden · ab Level {CHEST_UNLOCK_LEVEL[tier]}</div></div><button className="button small" onClick={() => void purchaseChestKeyAction(tier)} disabled={pendingKeyPurchase !== null || level < CHEST_UNLOCK_LEVEL[tier] || data.coins < price} data-testid={`button-buy-key-shop-${tier}`}><Coins size={13}/>{pendingKeyPurchase === tier ? 'Kaufe …' : price}</button></div>; })}</div>
             : <div className="page-grid">{ITEMS.filter((item) => item.type === shopTab && !item.craftOnly && !item.milestoneOnly).map((item) => <div className="shop-item" key={item.id} data-testid={`shop-item-${item.id}`}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{item.unlockLevel && level < item.unlockLevel ? `Ab Level ${item.unlockLevel} freigeschaltet` : item.type === 'food' ? `${item.amount || 0}% ${NEEDS.find((n) => n.id === item.effect)?.name.toLowerCase() || 'Wirkung'} · Vorrat: ${data.inventory[item.id] || 0}` : item.type === 'room' ? 'Dekoration für dein Zuhause' : item.type === 'background' ? 'Ersetzt das Zimmerbild durch ein Motiv' : item.type === 'toy' ? item.desc : SLOT_OF[item.id] === 'hat' ? 'Kopfbedeckung' : SLOT_OF[item.id] === 'outfit' ? 'Kleidung' : 'Accessoire'}</div></div><button className="button small" onClick={() => buy(item)} disabled={(item.type !== 'food' && item.id !== 'shampoo' && data.owned.includes(item.id)) || (!!item.unlockLevel && level < item.unlockLevel)} data-testid={`button-buy-${item.id}`}><Coins size={13}/>{item.type !== 'food' && item.id !== 'shampoo' && data.owned.includes(item.id) ? 'Gekauft' : item.unlockLevel && level < item.unlockLevel ? `Level ${item.unlockLevel}` : item.price}</button></div>)}</div>}
        </section>}

        {page === 'closet' && <>
          <div className="character-tabs" role="tablist" aria-label="Charakterbereich">
            <button className={`character-tab ${closetTab === 'wardrobe' ? 'active' : ''}`} role="tab" aria-selected={closetTab === 'wardrobe'} onClick={() => setClosetTab('wardrobe')} data-testid="tab-wardrobe"><ShirtIcon/>Kleiderschrank</button>
            <button className={`character-tab ${closetTab === 'evolution' ? 'active' : ''}`} role="tab" aria-selected={closetTab === 'evolution'} onClick={() => setClosetTab('evolution')} data-testid="tab-evolution"><Sparkles/>Entwicklung</button>
          </div>
          {closetTab === 'evolution'
            ? <EvolutionPage data={data as FullPetData} level={level} accountLinked={characterProgressLinked} onConnectAccount={() => setPage('online')} onPurchase={purchaseEvolution} onSelect={selectEvolutionForm}/>
            : <div className="closet-grid">
          <section className="panel closet-preview"><div className="panel-head"><h2 className="panel-title">Anprobe</h2></div>
            <div className="preview-stage"><Scottchi mood={mood} equipped={data.equipped} idle={idleStyle} formStage={data.activeEvolutionStage}/></div>
            <div className="style-sets"><div className="nav-label" style={{ padding: '12px 0 6px' }}>Outfit-Stile</div>
              {STYLE_SETS.map((s) => { const have = s.items.filter((i) => data.owned.includes(i)).length; const full = have === s.items.length; return <div key={s.id} className={`style-row ${full ? 'full' : ''}`} data-testid={`style-${s.id}`}>
                <ShirtIcon size={14}/><div className="item-info"><div className="mission-title">{s.name}{data.stylesWorn.includes(s.id) ? ' · getragen' : ''}</div><div className="mission-progress">{s.items.map((i) => itemById(i)?.name).join(' + ')} · {have}/{s.items.length}</div></div>
                <button className="button small" disabled={!full} onClick={() => wearStyle(s.items)} data-testid={`button-wear-style-${s.id}`}>Anziehen</button></div>; })}
            </div>
          </section>
          <div className="closet-lists">
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Kleidung & Hüte</h2><Sparkles size={18}/></div>{ownedOf('accessory').length ? ownedOf('accessory').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{SLOT_OF[id] === 'hat' ? 'Kopf' : SLOT_OF[id] === 'outfit' ? 'Körper' : SLOT_OF[id] === 'face' ? 'Gesicht' : 'Hals'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-equip-${id}`}>{data.equipped.includes(id) ? 'Ablegen' : 'Anziehen'}</button></div>; }) : <div className="empty-state">Noch nichts im Schrank. Im Laden warten Hüte, Hoodies und mehr.</div>}</section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Spielzeug</h2><Gamepad2 size={18}/></div>{ownedOf('toy').length ? ownedOf('toy').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{item.desc}</div></div>{TOY_USE[id] ? <button className="button small" onClick={() => { setPage('home'); playToy(id); }} data-testid={`button-use-${id}`}>Benutzen</button> : <span className="reward">Aktiv</span>}</div>; }) : <div className="empty-state">Ball, Ente, Seil und Co. findest du im Laden.</div>}</section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Zimmerstücke</h2><House size={18}/></div>{ownedOf('room').length ? ownedOf('room').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{data.roomItems.includes(id) ? 'Steht schon im Zimmer' : 'Passt gut ins Zimmer'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-place-${id}`}>{data.roomItems.includes(id) ? 'Wegräumen' : 'Aufstellen'}</button></div>; }) : <div className="empty-state">Mit einer Pflanze oder Lampe wird es gleich viel wohnlicher.</div>}</section>
            <section className="panel"><div className="panel-head"><h2 className="panel-title">Hintergründe</h2><House size={18}/></div>{ownedOf('background').length ? ownedOf('background').map((id) => { const item = itemById(id)!; return <div className="shop-item" key={id}><ItemIcon item={item}/><div className="item-info"><div className="item-title">{item.name}</div><div className="item-meta">{data.activeBackground === id ? 'Aktiv · ersetzt die Zimmerbilder' : 'Zimmermotiv'}</div></div><button className="button small" onClick={() => equip(id)} data-testid={`button-background-${id}`}>{data.activeBackground === id ? 'Zimmerbild zeigen' : 'Anwenden'}</button></div>; }) : <div className="empty-state">Freischaltbare Zimmermotive findest du im Laden.</div>}</section>
          </div>
        </div>}
        </>}

        {page === 'leaderboard' && <div className="page-grid">
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Persönliche Bestwerte</h2><Medal size={18}/></div>{GAMES.map((g) => <div className="leaderboard-row" key={g.id} data-testid={`highscore-${g.id}`}><span className="rank"><Trophy size={14}/></span><strong>{g.name}</strong><strong>{data.highscores[g.id] || 0} Pkt.</strong><button className="button small" onClick={() => openGame(g.id)} data-testid={`button-beat-${g.id}`}>Schlagen</button></div>)}</section>
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Deine stärksten Runden</h2><Trophy size={18}/></div><div className="side-note" style={{ margin: '0 0 12px' }}><strong>Geräte-lokale Bestenliste</strong>Hier stehen nur echte Spielrunden aus diesem Browser. Es gibt keine Online-Spieler und keinen Serverabgleich.</div>{topScore.length ? topScore.map((r, i) => <div className="leaderboard-row" key={r.id} data-testid={`score-row-${i}`}><span className="rank">#{i + 1}</span><div><strong>{GAMES.find((g) => g.id === r.game)?.name}</strong><div className="score-game">{new Date(r.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div><strong>{r.score} Pkt.</strong><Medal size={16}/></div>) : <div className="empty-state"><Trophy size={28}/><p>Noch keine Ergebnisse. Spiel eine Runde, deine echten Punkte erscheinen hier.</p><button className="button orange" onClick={() => setPage('games')} data-testid="button-play-first">Zu den Spielen</button></div>}</section>
        </div>}

        {page === 'achievements' && <>
          <section className="panel"><div className="panel-head"><h2 className="panel-title">Herausforderungen</h2><Target size={18}/></div><p className="subline" style={{ marginTop: 0 }}>Normale Challenges geben Münzen, XP und Artefaktstaub. Einmalige Kisten gibt es nur für 1.000- und 5.000-Punkte-Meilensteine.</p><div className="page-grid">{CHALLENGES.map((c) => <div className={`achievement ${data.challenges[c.id] ? '' : 'locked'}`} key={c.id} data-testid={`challenge-${c.id}`}><div className="item-icon">{data.challenges[c.id] ? <Check size={18}/> : <Target size={18}/>}</div><div className="item-info"><div className="item-title">{c.title}</div><div className="item-meta">{GAMES.find((g) => g.id === c.game)?.name} · {c.coins} Münzen · {c.xp} XP · +{c.dust} Artefaktstaub</div></div>{data.challenges[c.id] ? <span className="reward">Geschafft</span> : <button className="button small" onClick={() => openGame(c.game)} data-testid={`button-try-${c.id}`}>Versuchen</button>}</div>)}</div></section>
          <section className="panel" style={{ marginTop: 16 }} data-testid="panel-collections"><div className="panel-head"><h2 className="panel-title">Sammlungen</h2><Library size={18}/></div><p className="subline" style={{ marginTop: 0 }}>{uniqueOwned} verschiedene Gegenstände im Besitz. Komplette Sammlungen bringen eine einmalige Belohnung.</p><div className="page-grid">{collections.map((c) => <div className={`achievement ${c.have < c.items.length ? 'locked' : ''}`} key={c.id} data-testid={`collection-${c.id}`}>
            <div className="collection-thumbs">{c.items.slice(0, 4).map((i) => { const it = itemById(i)!; return <span key={i} className={data.owned.includes(i) ? 'have' : ''}>{it.img ? <img src={it.img} alt=""/> : it.icon}</span>; })}</div>
            <div className="item-info"><div className="item-title">{c.name}</div><div className="progress-track"><span style={{ width: `${c.have / c.items.length * 100}%` }}/></div><div className="item-meta">{c.have} / {c.items.length} · {c.rewardCoins} Münzen · {c.rewardXp} XP</div><div className="item-meta">{c.items.filter((i) => !data.owned.includes(i)).map((i) => itemById(i)?.name).join(', ') || 'Alles gesammelt'}</div></div>
            {c.have >= c.items.length ? data.claimedAchievements.includes(c.id) ? <span className="reward">Abgeholt</span> : <button className="button small" onClick={() => claimCollection(c.id)} data-testid={`button-claim-${c.id}`}>Abholen</button> : null}</div>)}</div></section>
          <section className="panel" style={{ marginTop: 16 }}><div className="panel-head"><h2 className="panel-title">Kleine große Momente</h2><Award size={18}/></div><div className="page-grid">{achievements.map((item) => <div className={`achievement ${item.progress < item.goal ? 'locked' : ''}`} key={item.id} data-testid={`achievement-${item.id}`}><div className="item-icon">{item.progress >= item.goal ? item.icon : '·'}</div><div className="item-info"><div className="item-title">{item.title}</div><div className="item-meta">{item.detail}</div><div className="progress-track"><span style={{ width: `${Math.min(100, item.progress / item.goal * 100)}%` }}/></div><div className="item-meta">{Math.min(item.progress, item.goal)} / {item.goal} · Belohnung {item.rewardSummary}</div></div>{item.progress >= item.goal ? data.claimedAchievements.includes(item.id) ? <span className="reward">Abgeholt</span> : <button className="button small" onClick={() => claimAchievement(item.id)} data-testid={`button-claim-${item.id}`}>Abholen</button> : null}</div>)}</div></section>
        </>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Hauptnavigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setActiveGame(null); }} data-testid={`mobile-nav-${id}`}><Icon/><span>{label}</span></button>)}</nav>

    {modal === 'settings' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><div className="panel-head"><h2>Einstellungen & Spielstand</h2><button className="button small ghost" onClick={() => setModal(null)} data-testid="button-close-settings"><X/></button></div><div className="settings-stack">
      <div className="setting-row"><div><strong>Spielklänge</strong><small>Werden direkt im Browser erzeugt</small></div><button className={`switch ${data.settings.sound ? 'on' : ''}`} onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, sound: !old.settings.sound } }))} aria-label="Spielklänge umschalten" data-testid="switch-sound">{data.settings.sound ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button></div>
      <div className="setting-row"><div><strong>Hintergrundmusik</strong><small>Eine leise, selbst erzeugte Melodie</small></div><button className={`switch ${data.settings.music ? 'on' : ''}`} onClick={() => setData((old) => ({ ...old, settings: { ...old.settings, music: !old.settings.music } }))} aria-label="Hintergrundmusik umschalten" data-testid="switch-music">{data.settings.music ? <Volume2 size={14}/> : <VolumeX size={14}/>}</button></div>
      <label className="setting-row volume-row"><span><strong>Lautstärke</strong><small>{data.settings.volume}%</small></span><input type="range" min="0" max="100" value={data.settings.volume} aria-label="Lautstärke" data-testid="input-volume" onChange={(e) => setData((old) => ({ ...old, settings: { ...old.settings, volume: Number(e.target.value) } }))}/></label>
      <div className="setting-row"><div><strong>Spielstand exportieren</strong><small>Versionierter JSON-Spielstand</small></div><button className="button small" onClick={exportSave} data-testid="button-export"><Download size={14}/> Export</button></div>
      <div className="setting-row"><div><strong>Spielstand importieren</strong><small>Vorhandene tamascottchi-JSON laden</small></div><button className="button small" onClick={() => setModal('import')} data-testid="button-import"><Plus size={14}/> Import</button></div>
      <div className="setting-row"><div><strong>Neu anfangen</strong><small>Löscht diesen lokalen Spielstand</small></div><button className="button small orange" onClick={() => setModal('reset')} data-testid="button-reset">Zurücksetzen</button></div>
      <p className="subline">Autospeicherung ist aktiv. Dein Spielstand bleibt auf diesem Gerät. Vor dem 2.0-Update wurde eine Sicherung angelegt.</p>
    </div></section></div>}
    {modal === 'name' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Wie soll Scottchi heißen?</h2><input className="input" value={nameDraft} maxLength={18} onChange={(e) => setNameDraft(e.target.value)} data-testid="input-pet-name"/><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-rename">Abbrechen</button><button className="button orange" onClick={() => { setData((old) => ({ ...old, name: nameDraft.trim() || 'Wuschel' })); setModal(null); }} data-testid="button-save-name">Speichern</button></div></section></div>}
    {modal === 'import' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Spielstand importieren</h2><p>Wähle die JSON-Datei, die du zuvor exportiert hast.</p><input ref={fileRef} type="file" accept="application/json,.json" className="input" data-testid="input-import-file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void file.text().then(setFileText); }}/><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-import">Abbrechen</button><button className="button orange" onClick={importSave} disabled={!fileText} data-testid="button-confirm-import">Spielstand laden</button></div></section></div>}
    {modal === 'reset' && <div className="dialog-backdrop" onClick={() => setModal(null)}><section className="dialog" onClick={(e) => e.stopPropagation()}><h2>Wirklich von vorn?</h2><p>Scottchi, Münzen, Ergebnisse und alle Gegenstände auf diesem Gerät werden gelöscht. Diese Aktion lässt sich nicht rückgängig machen.</p><div className="dialog-actions"><button className="button ghost" onClick={() => setModal(null)} data-testid="button-cancel-reset">Abbrechen</button><button className="button orange" onClick={resetGame} data-testid="button-confirm-reset">Spielstand löschen</button></div></section></div>}
    {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
  </div>;
}

export default App;
