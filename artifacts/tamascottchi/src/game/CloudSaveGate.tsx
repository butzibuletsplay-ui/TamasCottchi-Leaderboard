import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetOnlineProfileQueryKey, getGetOnlineSaveQueryKey,
  useCreateOnlineProfile, useGetOnlineProfile, useGetOnlineSave, useUpdateOnlineSave,
} from '@workspace/api-client-react';
import { assertSave, clearLegacyLocalSaves, initialData, normalize, readLegacyLocalSave, SaveLoadError, type FullPetData } from './data';

type CloudReadySave = { data: FullPetData; revision: number; userId: string };
type CloudGateState =
  | { kind: 'loading'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'choose'; local: FullPetData; cloud: FullPetData; revision: number; error?: string }
  | { kind: 'invalid-local'; raw: string; cloud: FullPetData | null; revision: number; error?: string }
  | { kind: 'ready'; save: CloudReadySave };

type LegacyRead = { data: FullPetData | null; error: SaveLoadError | null };

export function CloudSaveGate({
  userId,
  playerName,
  children,
}: {
  userId: string;
  playerName: string;
  children: (save: CloudReadySave) => ReactNode;
}) {
  const queryClient = useQueryClient();
  const profileQuery = useGetOnlineProfile({
    query: { enabled: true, queryKey: getGetOnlineProfileQueryKey(), retry: false },
  });
  const saveQuery = useGetOnlineSave({
    query: { enabled: !!profileQuery.data, queryKey: getGetOnlineSaveQueryKey(), retry: false },
  });
  const createProfile = useCreateOnlineProfile();
  const updateSave = useUpdateOnlineSave();
  const [legacy] = useState<LegacyRead>(() => {
    try { return { data: readLegacyLocalSave(), error: null }; }
    catch (error) { return { data: null, error: error instanceof SaveLoadError ? error : new SaveLoadError(String(error), '') }; }
  });
  const [state, setState] = useState<CloudGateState>({ kind: 'loading', message: 'Dein Cloud-Konto wird geprüft …' });
  const busy = useRef(false);

  useEffect(() => {
    if (state.kind !== 'loading' || busy.current) return;
    if (profileQuery.isLoading) return;

    const profileErrorStatus = statusCode(profileQuery.error);
    if (profileQuery.isError && profileErrorStatus === 404) {
      busy.current = true;
      const safePlayerName = cleanProfileName(playerName) || 'Scottchi-Fan';
      const petName = legacy.data?.name || 'Wuschel';
      void createProfile.mutateAsync({ data: { playerName: safePlayerName, petName } })
        .then(async () => {
          await queryClient.invalidateQueries({ queryKey: getGetOnlineProfileQueryKey() });
          await profileQuery.refetch();
        })
        .catch((error: unknown) => setState({ kind: 'error', message: errorMessage(error, 'Dein Cloud-Profil konnte nicht angelegt werden.') }))
        .finally(() => { busy.current = false; });
      return;
    }
    if (profileQuery.isError) {
      setState({ kind: 'error', message: errorMessage(profileQuery.error, 'Dein Cloud-Profil ist gerade nicht erreichbar.') });
      return;
    }
    if (!profileQuery.data || saveQuery.isLoading) return;
    if (saveQuery.isError) {
      setState({ kind: 'error', message: errorMessage(saveQuery.error, 'Dein Cloud-Spielstand konnte nicht geladen werden.') });
      return;
    }
    if (!saveQuery.data || busy.current) return;

    const cloudRaw = saveQuery.data.saveData;
    let cloud: FullPetData | null = null;
    if (cloudRaw) {
      try { cloud = restoreSave(cloudRaw); }
      catch (error) {
        setState({ kind: 'error', message: errorMessage(error, 'Der Cloud-Spielstand ist ungültig und wurde nicht verändert.') });
        return;
      }
    }

    if (legacy.error) {
      setState({
        kind: 'invalid-local',
        raw: legacy.error.raw,
        cloud,
        revision: saveQuery.data.revision,
      });
      return;
    }

    if (cloud && legacy.data) {
      setState({ kind: 'choose', local: legacy.data, cloud, revision: saveQuery.data.revision });
      return;
    }
    if (cloud) {
      clearLegacyLocalSaves();
      setState({ kind: 'ready', save: { data: cloud, revision: saveQuery.data.revision, userId } });
      return;
    }

    const firstSave = legacy.data || initialData();
    busy.current = true;
    setState({ kind: 'loading', message: legacy.data ? 'Dein bisheriger Spielstand wird einmalig in die Cloud übertragen …' : 'Dein neuer Cloud-Spielstand wird angelegt …' });
    void updateSave.mutateAsync({ data: { expectedRevision: 0, saveData: firstSave } })
      .then(async () => {
        const refreshed = await saveQuery.refetch();
        if (!refreshed.data?.saveData) throw new Error('Die Sicherung wurde angelegt, konnte aber nicht erneut geladen werden.');
        const saved = restoreSave(refreshed.data.saveData);
        clearLegacyLocalSaves();
        setState({ kind: 'ready', save: { data: saved, revision: refreshed.data.revision, userId } });
      })
      .catch((error: unknown) => setState({ kind: 'error', message: errorMessage(error, 'Dein Spielstand konnte nicht sicher in der Cloud gespeichert werden.') }))
      .finally(() => { busy.current = false; });
  }, [
    createProfile, legacy, playerName, profileQuery.data, profileQuery.error, profileQuery.isError,
    profileQuery.isLoading, profileQuery.refetch, queryClient, saveQuery.data, saveQuery.error,
    saveQuery.isError, saveQuery.isLoading, saveQuery.refetch, state.kind, updateSave, userId,
  ]);

  const useCloudSave = () => {
    if (state.kind !== 'choose' && state.kind !== 'invalid-local') return;
    const cloud = state.cloud;
    const revision = state.revision;
    if (!cloud) return;
    clearLegacyLocalSaves();
    setState({ kind: 'ready', save: { data: cloud, revision, userId } });
  };

  const uploadLocalSave = async () => {
    if (state.kind !== 'choose' || busy.current) return;
    busy.current = true;
    const local = state.local;
    const revision = state.revision;
    setState({ kind: 'loading', message: 'Der ausgewählte Spielstand wird mit der Cloud abgeglichen …' });
    try {
      await updateSave.mutateAsync({ data: { expectedRevision: revision, saveData: local } });
      const refreshed = await saveQuery.refetch();
      if (!refreshed.data?.saveData) throw new Error('Der Cloud-Spielstand konnte nach der Übertragung nicht geladen werden.');
      const saved = restoreSave(refreshed.data.saveData);
      clearLegacyLocalSaves();
      setState({ kind: 'ready', save: { data: saved, revision: refreshed.data.revision, userId } });
    } catch (error) {
      setState({ kind: 'choose', local, cloud: state.cloud, revision, error: errorMessage(error, 'Der Spielstand wurde nicht übertragen. Beide Versionen bleiben erhalten.') });
    } finally {
      busy.current = false;
    }
  };

  const startFreshCloudSave = async () => {
    if (state.kind !== 'invalid-local' || state.cloud || busy.current) return;
    busy.current = true;
    setState({ kind: 'loading', message: 'Ein neuer Cloud-Spielstand wird angelegt …' });
    try {
      await updateSave.mutateAsync({ data: { expectedRevision: 0, saveData: initialData() } });
      const refreshed = await saveQuery.refetch();
      if (!refreshed.data?.saveData) throw new Error('Der neue Cloud-Spielstand konnte nicht geladen werden.');
      const saved = restoreSave(refreshed.data.saveData);
      clearLegacyLocalSaves();
      setState({ kind: 'ready', save: { data: saved, revision: refreshed.data.revision, userId } });
    } catch (error) {
      setState({
        kind: 'invalid-local',
        raw: state.raw,
        cloud: null,
        revision: 0,
        error: errorMessage(error, 'Der neue Cloud-Spielstand konnte nicht angelegt werden.'),
      });
    } finally {
      busy.current = false;
    }
  };

  const retry = async () => {
    setState({ kind: 'loading', message: 'Die Cloud-Verbindung wird erneut geprüft …' });
    await Promise.all([profileQuery.refetch(), saveQuery.refetch()]);
    setState({ kind: 'loading', message: 'Dein Cloud-Spielstand wird vorbereitet …' });
  };

  if (state.kind === 'ready') return children(state.save);
  if (state.kind === 'loading') return <GateFrame title="tamascottchi verbindet sich" message={state.message}/>;
  if (state.kind === 'error') return <GateFrame title="Cloud-Spielstand nicht verfügbar" message={state.message}>
    <button className="button orange" onClick={() => void retry()} data-testid="button-cloud-gate-retry">Erneut versuchen</button>
  </GateFrame>;
  if (state.kind === 'choose') return <GateFrame title="Zwei Spielstände gefunden" message="Beide Versionen bleiben unangetastet, bis du auswählst. Der Upload behält serverseitig geschützte Belohnungen und Charakterpunkte.">
    <div className="cloud-choice-grid">
      <section><strong>Geräte-Spielstand</strong><span>{state.local.name} · Level {saveLevel(state.local)}</span><button className="button orange" onClick={() => void uploadLocalSave()} data-testid="button-migrate-local-save">Geräte-Stand einmalig übernehmen</button></section>
      <section><strong>Cloud-Spielstand</strong><span>{state.cloud.name} · Level {saveLevel(state.cloud)}</span><button className="button" onClick={useCloudSave} data-testid="button-use-cloud-save">Cloud-Stand behalten</button></section>
    </div>
    {state.error && <p role="alert" className="cloud-gate-error">{state.error}</p>}
  </GateFrame>;
  return <GateFrame title="Alter Spielstand nicht lesbar" message="Der bisherige Spielstand wurde nicht verändert. Du kannst ihn herunterladen oder – falls schon vorhanden – den Cloud-Stand verwenden.">
    <div className="cloud-gate-actions">
      <button className="button" onClick={() => downloadRawSave(state.raw)} data-testid="button-download-legacy-save">Fehlerhafte Datei herunterladen</button>
      {state.cloud
        ? <button className="button orange" onClick={useCloudSave} data-testid="button-discard-legacy-save">Cloud-Stand verwenden</button>
        : <button className="button orange" onClick={() => void startFreshCloudSave()} data-testid="button-start-fresh-cloud-save">Neuen Cloud-Spielstand beginnen</button>}
    </div>
    {state.error && <p role="alert" className="cloud-gate-error">{state.error}</p>}
  </GateFrame>;
}

function GateFrame({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return <main className="app-shell save-error">
    <style>{cloudGateStyles}</style>
    <div className="brand"><span className="brand-mark">t</span>tamascottchi</div>
    <section className="dialog cloud-gate-card" aria-live="polite">
      <span className="cloud-gate-icon" aria-hidden="true">☁</span>
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
    </section>
  </main>;
}

function restoreSave(value: Record<string, unknown>): FullPetData {
  const restored = normalize(value as Partial<FullPetData>);
  if (value.minigameDaily && typeof value.minigameDaily === 'object') {
    restored.minigameDaily = value.minigameDaily as FullPetData['minigameDaily'];
  }
  assertSave(restored);
  return restored;
}

function statusCode(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function cleanProfileName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 24);
}

function saveLevel(data: FullPetData): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, data.xp) / 20)) + 1);
}

function downloadRawSave(raw: string): void {
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tamascottchi-alter-spielstand.json';
  link.click();
  URL.revokeObjectURL(url);
}

const cloudGateStyles = `
.cloud-gate-card{max-width:680px;margin:42px auto;padding:clamp(22px,4vw,36px)}
.cloud-gate-card h2{margin:14px 0 8px}
.cloud-gate-icon{font-size:34px;line-height:1}
.cloud-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}
.cloud-choice-grid section{display:grid;align-content:start;gap:10px;padding:15px;border:1px solid #d7c5a8;border-radius:14px;background:#fffaf0}
.cloud-choice-grid section span{color:#806b5c;font-size:13px}
.cloud-gate-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.cloud-gate-error{color:#a94332;font-weight:800}
@media(max-width:640px){.cloud-choice-grid{grid-template-columns:1fr}.cloud-gate-card{margin:20px auto}}
`;
