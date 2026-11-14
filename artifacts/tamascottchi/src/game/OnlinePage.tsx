import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth, useClerk, useUser } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  AlertCircle, ArrowDownToLine, ArrowLeft, Check, CheckCircle2, Cloud, CloudDownload,
  Copy, Download, Heart, LockKeyhole, LogOut, RefreshCw, ShieldCheck,
  Trash2, Upload, UserRound, Users,
} from 'lucide-react';
import {
  getGetOnlineProfileQueryKey, getGetOnlineSaveQueryKey, useCreateOnlineProfile,
  useDeleteOnlineAccount, useGetOnlineProfile, useGetOnlineSave, useImportOnlineSave,
  useUpdateOnlineProfile, useUpdateOnlineSave,
} from '@workspace/api-client-react';
import type { OnlineProfileInput, OnlineProfileUpdate } from '@workspace/api-client-react';
import { levelFor, type FullPetData } from './data';

type OnlinePageProps = {
  localSave: FullPetData;
  onRestoreCloud(saveData: Record<string, unknown>, revision: number): void;
  onCloudLinked(revision: number): void;
  syncStatus?: 'offline' | 'checking' | 'unlinked' | 'syncing' | 'synced' | 'conflict' | 'error';
};
type ProfileFields = OnlineProfileInput;
type BackupKind = 'local' | 'cloud';

export function OnlinePage({ localSave, onRestoreCloud, onCloudLinked, syncStatus = 'offline' }: OnlinePageProps) {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user, isLoaded: userLoaded } = useUser();
  const [editProfile, setEditProfile] = useState(false);
  const [accountConfirm, setAccountConfirm] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [backedUp, setBackedUp] = useState<BackupKind[]>([]);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);

  const profileQuery = useGetOnlineProfile({
    query: { enabled: !!isSignedIn, queryKey: getGetOnlineProfileQueryKey(), retry: false },
  });
  const profile = profileQuery.data;
  const saveQuery = useGetOnlineSave({
    query: { enabled: !!isSignedIn && !!profile, queryKey: getGetOnlineSaveQueryKey() },
  });
  const cloud = saveQuery.data;
  const createProfile = useCreateOnlineProfile();
  const updateProfile = useUpdateOnlineProfile();
  const updateSave = useUpdateOnlineSave();
  const importSave = useImportOnlineSave();
  const deleteAccount = useDeleteOnlineAccount();

  const localLevel = useMemo(() => levelFor(localSave.xp), [localSave.xp]);
  const profileForm = useForm<ProfileFields>({
    defaultValues: { playerName: '', petName: '' },
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!profile) return;
    profileForm.reset({ playerName: profile.playerName, petName: profile.petName });
  }, [profile, profileForm]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const localSaveData = useMemo(() => ({ ...localSave }) as Record<string, unknown>, [localSave]);
  const cloudData = cloud?.saveData ?? null;
  const hasCloud = !!cloudData;
  const busy = createProfile.isPending || updateProfile.isPending || updateSave.isPending || importSave.isPending;
  const lastError = createProfile.error || updateProfile.error || updateSave.error || importSave.error;

  const invalidateProfile = () => queryClient.invalidateQueries({ queryKey: getGetOnlineProfileQueryKey() });
  const invalidateSave = () => queryClient.invalidateQueries({ queryKey: getGetOnlineSaveQueryKey() });
  const errorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) return error.message;
    return 'Das hat gerade nicht geklappt. Deine Daten sind unverändert. Bitte versuche es noch einmal.';
  };

  const downloadBackup = (data: Record<string, unknown>, label: string, kind: BackupKind) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tamascottchi-${label}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackedUp((items) => items.includes(kind) ? items : [...items, kind]);
    setToast(kind === 'local' ? 'Lokale Sicherung wurde heruntergeladen.' : 'Cloud-Sicherung wurde heruntergeladen.');
  };

  const finishCloudLink = (revision: number) => {
    void invalidateProfile();
    void invalidateSave();
    onCloudLinked(revision);
  };

  const submitProfile = profileForm.handleSubmit((values) => {
    if (!profile) {
      createProfile.mutate({ data: values }, {
        onSuccess: () => {
          void invalidateProfile();
          setEditProfile(false);
          setToast('Dein Profil ist eingerichtet.');
        },
      });
      return;
    }
    const payload: OnlineProfileUpdate = {
      playerName: values.playerName.trim(),
      petName: values.petName.trim(),
    };
    updateProfile.mutate({ data: payload }, {
      onSuccess: () => {
        void invalidateProfile();
        setEditProfile(false);
        setToast('Profil gespeichert.');
      },
    });
  });

  const backupThenReplaceCloud = () => {
    if (!cloud || !localSaveData) return;
    if (!backedUp.includes('local')) {
      downloadBackup(localSaveData, 'lokale-sicherung-vor-cloud-import', 'local');
      return;
    }
    if (!backedUp.includes('cloud') && cloudData) {
      downloadBackup(cloudData, 'cloud-sicherung-vor-ersatz', 'cloud');
      return;
    }
    const payload = { expectedRevision: cloud.revision, saveData: localSaveData };
    const complete = (revision: number, message: string) => {
      setConflict(false);
      setBackedUp((items) => items.filter((item) => item !== 'cloud'));
      finishCloudLink(revision);
      setToast(message);
    };
    if (hasCloud || cloud.imported) {
      updateSave.mutate({ data: payload }, {
        onSuccess: (result) => complete(result.revision, 'Lokaler Spielstand ist jetzt in der Cloud gesichert.'),
      });
    } else {
      const requestId = createRequestId();
      importSave.mutate({ data: { ...payload, requestId } }, {
        onSuccess: (result) => complete(result.revision, result.duplicate ? 'Dieser Import war bereits gesichert.' : 'Dein Spielstand ist jetzt in der Cloud.'),
      });
    }
  };

  const restoreCloud = () => {
    if (!cloudData || !cloud) return;
    if (!backedUp.includes('local')) {
      downloadBackup(localSaveData, 'lokale-sicherung-vor-wiederherstellung', 'local');
      return;
    }
    onRestoreCloud(cloudData, cloud.revision);
    setBackedUp((items) => items.filter((item) => item !== 'local'));
    setToast('Cloud-Spielstand wurde lokal wiederhergestellt.');
  };

  const confirmDelete = async () => {
    try {
      await deleteAccount.mutateAsync();
      if (user?.id) localStorage.removeItem(`tamascottchi-cloud-link:${user.id}`);
      queryClient.clear();
      await signOut({ redirectUrl: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/` || '/' });
    } catch {
      setToast('Konto konnte nicht gelöscht werden. Bitte versuche es später erneut.');
    }
  };

  const copyFriendCode = async () => {
    if (!profile?.friendCode) return;
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopied(true);
      setToast('Freundescode kopiert. Verbindungen kommen in einer späteren Phase.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setToast('Der Code konnte nicht kopiert werden. Du kannst ihn markieren und kopieren.');
    }
  };

  if (!userLoaded || (isSignedIn && profileQuery.isLoading)) {
    return <OnlineFrame><OnlineLoading /></OnlineFrame>;
  }

  if (!isSignedIn) {
    return <OnlineFrame>
      <section className="on-card on-locked">
        <span className="on-icon on-icon--clay"><LockKeyhole size={23} /></span>
        <p className="on-eyebrow">DEIN ONLINE-PLÄTZCHEN</p>
        <h1>Dein Spiel bleibt offline spielbar.</h1>
        <p>Mit einem Konto kannst du ein Profil anlegen und deinen Spielstand in der Cloud sichern. Freund:innen verbinden und besuchen kommt erst in einer späteren Phase.</p>
        <Link href="/sign-in" className="on-button on-button--primary" data-testid="link-online-sign-in">Anmelden oder Konto anlegen</Link>
      </section>
    </OnlineFrame>;
  }

  const profileMissing = profileQuery.isError && (profileQuery.error as { status?: number } | null)?.status === 404;
  const needsProfile = !profile && (profileMissing || profileQuery.isSuccess);

  return (
    <OnlineFrame>
      <style>{onlineStyles}</style>
      <header className="on-top">
        <div className="on-top__heading">
          <p className="on-eyebrow">DEIN KLEINES ONLINE-ZUHAUSE</p>
          <h1>Profil &amp; Spielstand</h1>
          <p>Alles Wichtige an einem Ort. Dein Spiel funktioniert weiterhin auch ohne Internet.</p>
        </div>
        <div className="on-session">
          <span className="on-avatar">{(user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || 'T').toUpperCase()}</span>
          <div><strong>{user?.firstName || 'Dein Konto'}</strong><small>{user?.emailAddresses?.[0]?.emailAddress}</small></div>
        </div>
      </header>

      {profileQuery.isError && !profile && !profileMissing && (
        <div className="on-alert on-alert--warm" role="status" data-testid="status-profile-retry">
          <AlertCircle size={18} /><div><strong>Profil konnte nicht geladen werden.</strong><span>Dein Offline-Spielstand ist sicher. Prüfe die Verbindung und lade erneut.</span></div>
          <button type="button" className="on-text-button" onClick={() => void profileQuery.refetch()} data-testid="button-retry-profile"><RefreshCw size={15} /> Erneut laden</button>
        </div>
      )}

      {needsProfile ? (
        <section className="on-card on-profile-setup">
          <div className="on-profile-setup__art"><span className="on-orbit">t</span><span className="on-twinkle">+</span></div>
          <p className="on-eyebrow">ERSTER SCHRITT</p>
          <h2>Wie dürfen wir euch nennen?</h2>
          <p>Nur dein Spielername und der Name deines Scottchis werden im Profil gespeichert.</p>
          <ProfileForm form={profileForm} submitting={createProfile.isPending} submit={submitProfile} submitLabel="Profil anlegen" />
        </section>
      ) : profile ? (
        <>
          <section className="on-profile-card">
            <div className="on-profile-card__color" aria-hidden="true"><span className="on-profile-card__stamp">t</span></div>
            <div className="on-profile-card__body">
              <div className="on-profile-card__row">
                <div>
                  <p className="on-eyebrow">SPIELERPROFIL</p>
                  <h2>{profile.playerName}<span className="on-profile-card__pet">mit {profile.petName}</span></h2>
                </div>
                <button type="button" className="on-button on-button--soft" onClick={() => { setEditProfile((value) => !value); profileForm.reset({ playerName: profile.playerName, petName: profile.petName }); }} data-testid="button-edit-profile">
                  <UserRound size={16} /> {editProfile ? 'Schließen' : 'Bearbeiten'}
                </button>
              </div>
              <div className="on-profile-facts">
                <div><span className="on-fact-icon"><Heart size={16} /></span><div><small>Gemeinsam erreicht</small><strong>Level {profile.level}</strong></div></div>
                <div><span className="on-fact-icon"><ShieldCheck size={16} /></span><div><small>Profil-Sichtbarkeit</small><strong>Privat</strong></div></div>
                <div><span className="on-fact-icon"><Users size={16} /></span><div><small>Freundescode</small><strong className="on-code">{profile.friendCode}</strong></div><button type="button" className="on-copy" onClick={() => void copyFriendCode()} aria-label="Freundescode kopieren" data-testid="button-copy-friend-code">{copied ? <Check size={15} /> : <Copy size={15} />}</button></div>
              </div>
              {editProfile && <div className="on-edit-panel"><ProfileForm form={profileForm} submitting={updateProfile.isPending} submit={submitProfile} submitLabel="Änderungen speichern" /></div>}
              <div className="on-profile-foot">
                <p><LockKeyhole size={14} /> Freundescode-Verbindungen und Besuche kommen erst in einer späteren Phase.</p>
                <span className="on-private-label"><ShieldCheck size={14} /> Nur für dich sichtbar</span>
              </div>
            </div>
          </section>

          <div className="on-section-heading">
            <div><p className="on-eyebrow">SICHER WEITER SPIELEN</p><h2>Dein Spielstand</h2></div>
            <span className="on-local-pill"><span /> Lokal bleibt lokal</span>
          </div>
          {syncStatus !== 'offline' && <div className={`on-sync-banner on-sync-banner--${syncStatus}`} role="status" data-testid={`status-cloud-sync-${syncStatus}`}>
            <Cloud size={16} />
            <span>{syncStatus === 'checking' ? 'Cloud-Verbindung wird geprüft …' : syncStatus === 'unlinked' ? 'Wähle, welchen Spielstand dieses Gerät verwenden soll.' : syncStatus === 'syncing' ? 'Dein Fortschritt wird sicher in der Cloud gespeichert …' : syncStatus === 'synced' ? 'Änderungen auf diesem Gerät werden automatisch gesichert.' : syncStatus === 'conflict' ? 'Die Cloud-Version hat sich auf einem anderen Gerät geändert. Bitte vergleiche die Spielstände.' : 'Verbindung unterbrochen. Der lokale Spielstand bleibt sicher.'}</span>
          </div>}
          {saveQuery.isLoading ? <OnlineSaveLoading /> : saveQuery.isError ? (
            <div className="on-alert on-alert--warm" role="status" data-testid="status-cloud-load-error">
              <Cloud size={18} /><div><strong>Cloud-Spielstand gerade nicht erreichbar.</strong><span>Dein lokaler Fortschritt bleibt sicher und unverändert.</span></div>
              <button type="button" className="on-text-button" onClick={() => void saveQuery.refetch()} data-testid="button-retry-cloud"><RefreshCw size={15} /> Erneut laden</button>
            </div>
          ) : cloud ? (
            <section className="on-cloud-card">
              <div className="on-cloud-card__top">
                <div className="on-cloud-mark"><Cloud size={21} /></div>
                <div className="on-cloud-card__title"><div><h3>Cloud-Sicherung</h3><p>{cloud.updatedAt ? `Zuletzt gesichert ${formatDate(cloud.updatedAt)}` : 'Noch keine Sicherung gespeichert'}</p></div></div>
                <span className={`on-cloud-status ${hasCloud ? 'is-ready' : ''}`}><span />{hasCloud ? 'Gesichert' : 'Noch leer'}</span>
              </div>
              <div className="on-save-compare">
                <SaveSummary title="Auf diesem Gerät" name={localSave.name} level={localLevel} revision={null} updatedAt={null} />
                <div className="on-compare-mark"><ArrowLeft size={16} /><span>oder</span><ArrowDownToLine size={16} /></div>
                <SaveSummary title="In der Cloud" name={getSaveName(cloudData)} level={getSaveLevel(cloudData)} revision={cloud.revision} updatedAt={cloud.updatedAt} empty={!hasCloud} />
              </div>
              {!hasCloud ? (
                <div className="on-cloud-actions">
                  <p>Es gibt noch keine Cloud-Sicherung. Speichere eine Kopie deines aktuellen lokalen Fortschritts.</p>
                  <button type="button" className="on-button on-button--primary" onClick={() => setConflict(true)} disabled={busy} data-testid="button-start-cloud-backup"><Upload size={16} /> Lokalen Spielstand sichern</button>
                </div>
              ) : (
                <div className="on-cloud-actions">
                  <p>Wähle bewusst, welche Version du behalten möchtest. Beim Ersetzen kannst du vorher eine Datei herunterladen.</p>
                  <div className="on-cloud-buttons">
                    <button type="button" className="on-button on-button--primary" onClick={() => setConflict(true)} disabled={busy} data-testid="button-open-save-choices"><CloudDownload size={16} /> Sicherung verwalten</button>
                    <button type="button" className="on-button on-button--soft" onClick={() => downloadBackup(cloudData!, 'cloud-sicherung', 'cloud')} data-testid="button-download-cloud-backup"><Download size={15} /> Cloud-Datei laden</button>
                  </div>
                </div>
              )}
              {conflict && <div className="on-conflict" role="region" aria-label="Spielstand auswählen" data-testid="panel-save-conflict">
                <div className="on-conflict__heading"><span className="on-icon on-icon--sage"><RefreshCw size={19} /></span><div><strong>Welche Version soll bleiben?</strong><small>Die Auswahl ändert nicht automatisch deinen laufenden Spielstand.</small></div></div>
                <div className="on-choice-grid">
                  <button type="button" className="on-choice" onClick={backupThenReplaceCloud} disabled={busy} data-testid="button-choose-local-save">
                    <span className="on-choice__icon"><Upload size={18} /></span><strong>{!backedUp.includes('local') ? 'Lokalen Spielstand in die Cloud' : backedUp.includes('cloud') || !hasCloud ? 'Jetzt in die Cloud sichern' : 'Cloud-Sicherung zuerst herunterladen'}</strong><small>Level {localLevel} · {localSave.name}</small>
                  {!backedUp.includes('local') && <em>Schritt 1: Zuerst die lokale Sicherungsdatei herunterladen.</em>}
                  {backedUp.includes('local') && !backedUp.includes('cloud') && hasCloud && <em>Lokale Datei gesichert. Klicke hier, um auch die Cloud-Datei herunterzuladen.</em>}
                  {backedUp.includes('local') && (!hasCloud || backedUp.includes('cloud')) && <em className="is-done"><CheckCircle2 size={13} /> Sicherungsdatei heruntergeladen. Klicke hier, um den Upload zu starten.</em>}
                  </button>
                  {hasCloud && <button type="button" className="on-choice" onClick={restoreCloud} disabled={busy} data-testid="button-choose-cloud-save">
                    <span className="on-choice__icon"><CloudDownload size={18} /></span><strong>Cloud-Spielstand auf dieses Gerät</strong><small>Level {getSaveLevel(cloudData)} · {getSaveName(cloudData)}</small>
                    {!backedUp.includes('local') && <em>Vorher lokale Datei herunterladen</em>}
                    {backedUp.includes('local') && <em className="is-done"><CheckCircle2 size={13} /> Lokale Sicherung heruntergeladen</em>}
                  </button>}
                </div>
                <button type="button" className="on-text-button on-cancel-choice" onClick={() => { setConflict(false); setBackedUp([]); }} data-testid="button-cancel-save-choices">Abbrechen</button>
              </div>}
            </section>
          ) : null}

          <section className="on-later-card">
            <div className="on-later-card__icon"><Users size={19} /></div>
            <div><p className="on-eyebrow">SPÄTERE PHASE</p><h3>Freund:innen, Besuche &amp; gemeinsames Spielen</h3><p>Dein Freundescode ist schon für später reserviert. Verbindungen und Besuche sind noch nicht verfügbar.</p></div>
            <span className="on-later-tag">Noch nicht aktiv</span>
          </section>
        </>
      ) : (
        <section className="on-card on-empty">
          <span className="on-icon on-icon--sage"><Cloud size={22} /></span><h2>Profil wird vorbereitet</h2>
          <p>Dein Online-Profil konnte noch nicht angelegt werden. Dein lokaler Spielstand bleibt unberührt.</p>
          <button type="button" className="on-button on-button--soft" onClick={() => void profileQuery.refetch()} data-testid="button-retry-profile-empty"><RefreshCw size={15} /> Erneut versuchen</button>
        </section>
      )}

      {lastError && <div className="on-alert on-alert--error" role="alert" data-testid="status-online-mutation-error"><AlertCircle size={18} /><span>{errorMessage(lastError)}</span><button type="button" onClick={() => { void profileQuery.refetch(); void saveQuery.refetch(); }}>Erneut laden</button></div>}

      <section className="on-account-actions">
        <div><p className="on-eyebrow">KONTO &amp; DATENSCHUTZ</p><h3>Du entscheidest, was bleibt.</h3><p>Das Löschen entfernt dein Online-Profil und die Cloud-Sicherung. Deine lokale Datei auf diesem Gerät wird nicht gelöscht.</p></div>
        <div className="on-account-actions__buttons">
          {!accountConfirm ? <button type="button" className="on-button on-button--danger-outline" onClick={() => setAccountConfirm(true)} data-testid="button-open-delete-account"><Trash2 size={15} /> Konto löschen</button> : (
            <div className="on-delete-confirm" role="alertdialog" aria-label="Konto löschen bestätigen">
              <strong>Online-Konto endgültig löschen?</strong><p>Profil und Cloud-Sicherung werden entfernt. Vorher herunterladen, was du behalten möchtest.</p>
              <div><button type="button" className="on-button on-button--danger" onClick={() => void confirmDelete()} disabled={deleteAccount.isPending} data-testid="button-confirm-delete-account">{deleteAccount.isPending ? 'Wird gelöscht …' : 'Ja, Konto löschen'}</button><button type="button" className="on-button on-button--soft" onClick={() => setAccountConfirm(false)} data-testid="button-cancel-delete-account">Abbrechen</button></div>
            </div>
          )}
          <button type="button" className="on-button on-button--soft" onClick={() => void signOut({ redirectUrl: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/` || '/' })} data-testid="button-sign-out"><LogOut size={15} /> Abmelden</button>
        </div>
      </section>

      <footer className="on-footer"><span><ShieldCheck size={15} /> Dein Konto schützt dein Profil, nicht deinen Offline-Zugang.</span><span>Profil erstellt {profile ? formatDate(profile.createdAt) : '—'}</span></footer>
      {busy && <div className="on-progress" role="status" data-testid="status-online-saving"><span className="on-progress__bar" />Änderung wird sicher gespeichert …</div>}
      {toast && <div className="on-toast" role="status" data-testid="status-online-success">{toast}</div>}
    </OnlineFrame>
  );
}

function ProfileForm({ form, submitting, submit, submitLabel }: {
  form: ReturnType<typeof useForm<ProfileFields>>;
  submitting: boolean;
  submit: (event?: React.FormEvent) => void;
  submitLabel: string;
}) {
  const { register, formState: { errors } } = form;
  return <form className="on-profile-form" onSubmit={submit as React.FormEventHandler} noValidate>
    <label>Dein Spielername
      <input {...register('playerName', { required: 'Bitte gib einen Namen ein.', minLength: { value: 2, message: 'Mindestens 2 Zeichen.' }, maxLength: { value: 24, message: 'Höchstens 24 Zeichen.' } })} maxLength={24} autoComplete="nickname" placeholder="Zum Beispiel Maja" data-testid="input-player-name" />
      {errors.playerName && <small className="on-field-error">{errors.playerName.message}</small>}
    </label>
    <label>Name deines Scottchis
      <input {...register('petName', { required: 'Bitte gib deinem Scottchi einen Namen.', minLength: { value: 1, message: 'Mindestens 1 Zeichen.' }, maxLength: { value: 18, message: 'Höchstens 18 Zeichen.' } })} maxLength={18} placeholder="Zum Beispiel Scottchi" data-testid="input-online-pet-name" />
      {errors.petName && <small className="on-field-error">{errors.petName.message}</small>}
    </label>
    <button className="on-button on-button--primary" type="submit" disabled={submitting} data-testid="button-save-online-profile">{submitting ? 'Wird gespeichert …' : submitLabel}</button>
  </form>;
}

function SaveSummary({ title, name, level, revision, updatedAt, empty }: {
  title: string; name: string; level: number; revision: number | null; updatedAt: string | Date | null; empty?: boolean;
}) {
  return <div className={`on-save-summary ${empty ? 'is-empty' : ''}`}>
    <span className="on-save-summary__icon">{empty ? <Cloud size={17} /> : <Heart size={16} />}</span>
    <div><small>{title}</small><strong>{empty ? 'Noch kein Spielstand' : name}</strong><span>{empty ? 'Bereit für deine erste Sicherung' : `Level ${level}${revision !== null ? ` · Version ${revision}` : ''}${updatedAt ? ` · ${formatDate(updatedAt)}` : ''}`}</span></div>
  </div>;
}

function OnlineFrame({ children }: { children: React.ReactNode }) {
  return <main className="on-page">
    <style>{onlineStyles}</style>
    <div className="on-paper-grain" aria-hidden="true" />
    <div className="on-wrap">
      <a className="on-brand" href="/" data-testid="link-back-to-game"><span className="on-brand__mark">t</span><span>tamascottchi</span><span className="on-brand__divider" /><span className="on-brand__section">Online-Profil</span></a>
      <div className="on-back-row"><a href="/" className="on-back-link"><ArrowLeft size={15} /> Zurück zum Spiel</a></div>
      {children}
    </div>
  </main>;
}

function OnlineLoading() {
  return <div className="on-loading" aria-label="Online-Profil lädt" data-testid="status-online-loading">
    <div className="on-skeleton on-skeleton--hero"><span /><span /><span /></div>
    <div className="on-skeleton on-skeleton--row"><span /><span /></div>
    <div className="on-loading-label"><span className="on-loading-dot" /> Dein Online-Plätzchen wird vorbereitet …</div>
  </div>;
}

function OnlineSaveLoading() {
  return <div className="on-skeleton on-skeleton--save" aria-label="Cloud-Spielstand lädt"><span /><span /><span /></div>;
}

function getSaveName(save: Record<string, unknown> | null | undefined) {
  return typeof save?.name === 'string' ? save.name : 'Scottchi';
}

function getSaveLevel(save: Record<string, unknown> | null | undefined) {
  const xp = typeof save?.xp === 'number' ? save.xp : 0;
  return levelFor(xp);
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'kürzlich';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const values = new Uint8Array(16);
  globalThis.crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

const onlineStyles = `
.on-page{--on-ink:#503626;--on-paper:#fff0d3;--on-card:#fff9ec;--on-muted:#806750;--on-clay:#bf6845;--on-lime:#f2c77e;--on-sage:#dce8d4;--on-line:#dacbb2;min-height:100dvh;background:#fff0d3;color:var(--on-ink);font-family:'Nunito',sans-serif;position:relative;padding:0 22px 76px;isolation:isolate}
.on-paper-grain{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.22;background-image:radial-gradient(#987e60 .7px,transparent .8px);background-size:14px 14px}
.on-wrap{width:min(100%,1030px);margin:0 auto;position:relative}.on-brand{display:flex;align-items:center;gap:9px;color:var(--on-ink);text-decoration:none;padding:22px 0 15px;font:700 21px 'Fredoka',sans-serif;letter-spacing:-.6px}.on-brand__mark{width:33px;height:33px;display:grid;place-items:center;background:#f2c77e;border:1.8px solid var(--on-ink);border-radius:50%;box-shadow:2px 2px 0 var(--on-ink);font-size:18px}.on-brand__divider{height:19px;width:1px;background:#bca98e;margin:0 3px 0 7px}.on-brand__section{color:var(--on-muted);font:700 12px 'Nunito',sans-serif;letter-spacing:0}.on-back-row{border-top:1px solid #e3d3b8;padding:10px 0 22px}.on-back-link{display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:var(--on-muted);font-size:12px;font-weight:900}.on-back-link:hover{color:var(--on-clay)}
.on-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin:2px 0 23px}.on-top__heading{max-width:620px}.on-eyebrow{font:500 10px 'DM Mono',monospace;letter-spacing:1.6px;color:#8b7058;margin:0 0 7px}.on-top h1,.on-section-heading h2{font:600 clamp(30px,5vw,44px)/.98 'Fredoka',sans-serif;letter-spacing:-1.2px;margin:0}.on-top__heading>p:last-child{color:var(--on-muted);font-size:13px;line-height:1.55;margin:9px 0 0}.on-session{display:flex;align-items:center;gap:9px;padding:9px 13px 9px 9px;border:1.5px solid var(--on-ink);border-radius:13px;background:var(--on-card);box-shadow:2px 3px 0 var(--on-ink);max-width:280px}.on-avatar{width:34px;height:34px;border-radius:50%;background:#d8e5d0;border:1.5px solid var(--on-ink);display:grid;place-items:center;font:700 15px 'Fredoka'}.on-session strong,.on-session small{display:block;max-width:205px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.on-session strong{font:600 14px 'Fredoka'}.on-session small{font-size:10px;color:var(--on-muted);margin-top:2px}
.on-profile-card,.on-card,.on-cloud-card,.on-later-card,.on-account-actions{border:2px solid var(--on-ink);border-radius:17px;background:var(--on-card);box-shadow:4px 5px 0 var(--on-ink);overflow:hidden}.on-profile-card{display:grid;grid-template-columns:148px 1fr;margin-bottom:30px}.on-profile-card__color{position:relative;display:grid;place-items:center;overflow:hidden;background:#dbe7d5;border-right:2px solid var(--on-ink);min-height:220px}.on-profile-card__color:before,.on-profile-card__color:after{content:'';position:absolute;border:1.5px solid var(--on-ink);border-radius:50%}.on-profile-card__color:before{width:150px;height:150px;background:#f2c77e;top:18px;left:-46px}.on-profile-card__color:after{width:190px;height:75px;background:#aec5a7;bottom:-12px;right:-44px}.on-profile-card__stamp{position:relative;z-index:1;width:73px;height:83px;border:2px solid var(--on-ink);border-radius:45% 45% 40% 40%;display:grid;place-items:center;background:#efb879;font:700 40px 'Fredoka';box-shadow:3px 4px 0 var(--on-ink);transform:rotate(-7deg)}.on-profile-card__body{padding:21px 24px 16px;min-width:0}.on-profile-card__row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.on-profile-card__row h2{font:600 28px/1 'Fredoka';margin:0;letter-spacing:-.6px}.on-profile-card__pet{display:block;color:var(--on-muted);font:600 13px 'Nunito';margin-top:5px;letter-spacing:0}.on-profile-facts{display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:10px;margin:21px 0 17px}.on-profile-facts>div{display:flex;align-items:center;gap:8px;min-width:0}.on-fact-icon{width:32px;height:32px;display:grid;place-items:center;flex:none;border-radius:10px;border:1.4px solid #b9a58c;background:#f3ead8;color:#a45d3f}.on-profile-facts small,.on-profile-facts strong{display:block}.on-profile-facts small{font-size:10px;color:var(--on-muted)}.on-profile-facts strong{font:600 13px 'Fredoka';margin-top:3px}.on-code{font-family:'DM Mono',monospace!important;font-size:12px!important;letter-spacing:.3px}.on-copy{border:1px solid #c8b79e;border-radius:7px;background:#fff8e8;color:var(--on-ink);width:27px;height:27px;display:grid;place-items:center;flex:none}.on-profile-foot{border-top:1px solid #e5d7bf;padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px}.on-profile-foot p{display:flex;align-items:center;gap:6px;margin:0;color:var(--on-muted);font-size:10px;line-height:1.4}.on-profile-foot p svg{flex:none;color:#907454}.on-text-button{border:0;background:none;padding:5px 0;color:#9c5439;font-size:11px;font-weight:900;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}.on-text-button:hover{text-decoration:underline}.on-text-button:disabled{opacity:.55}
.on-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:39px;border:1.7px solid var(--on-ink);border-radius:9px;padding:8px 12px;text-decoration:none;font-size:12px;font-weight:900;transition:transform .15s,box-shadow .15s;cursor:pointer}.on-button:hover{transform:translate(-1px,-1px)}.on-button:disabled{opacity:.58;cursor:wait;transform:none}.on-button--primary{background:var(--on-lime);color:var(--on-ink);box-shadow:2px 3px 0 var(--on-ink)}.on-button--soft{background:#fff9ec;color:var(--on-ink);box-shadow:2px 3px 0 var(--on-ink)}.on-button--danger-outline{background:transparent;color:#a34436;border-color:#a34436;box-shadow:2px 3px 0 #a34436}.on-button--danger{background:#a34436;color:#fff9ec;border-color:#793629;box-shadow:2px 3px 0 #793629}
.on-section-heading{display:flex;align-items:flex-end;justify-content:space-between;margin:0 0 12px}.on-section-heading h2{font-size:31px}.on-local-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid #bfd0b6;border-radius:99px;padding:6px 10px;background:#edf3e7;color:#56714e;font-size:10px;font-weight:900}.on-local-pill span,.on-cloud-status span{width:7px;height:7px;border-radius:50%;background:#75946a;box-shadow:0 0 0 3px #d9e5d2}
.on-cloud-card{margin-bottom:20px;padding:19px 21px}.on-cloud-card__top{display:flex;align-items:center;gap:12px}.on-cloud-mark{width:43px;height:43px;display:grid;place-items:center;border:1.5px solid var(--on-ink);border-radius:13px;background:#dce8d4;box-shadow:2px 2px 0 var(--on-ink);color:#506d55}.on-cloud-card__title{flex:1}.on-cloud-card__title h3{font:600 18px 'Fredoka';margin:0}.on-cloud-card__title p{font-size:11px;color:var(--on-muted);margin:3px 0 0}.on-cloud-status{display:inline-flex;align-items:center;gap:7px;border-radius:99px;background:#f2eadb;padding:6px 10px;color:#8d765b;font-size:10px;font-weight:900}.on-cloud-status.is-ready{background:#e8f0e3;color:#52714b}.on-cloud-status:not(.is-ready) span{background:#b99b6d;box-shadow:0 0 0 3px #ede0c7}
.on-save-compare{display:grid;grid-template-columns:1fr 58px 1fr;align-items:center;margin:19px 0 17px}.on-save-summary{display:flex;align-items:center;gap:10px;padding:13px;border:1.5px solid #dfd1ba;border-radius:12px;background:#fffdf6;min-width:0}.on-save-summary.is-empty{background:#f8f3e9;border-style:dashed}.on-save-summary__icon{width:34px;height:34px;display:grid;place-items:center;flex:none;border-radius:10px;background:#f3dfc5;color:#a55d3d}.on-save-summary.is-empty .on-save-summary__icon{background:#e7e5d8;color:#81775e}.on-save-summary small,.on-save-summary strong,.on-save-summary>div>span{display:block}.on-save-summary small{color:var(--on-muted);font-size:10px}.on-save-summary strong{font:600 14px 'Fredoka';margin:2px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.on-save-summary>div>span{font-size:10px;color:#847561}.on-compare-mark{display:grid;justify-items:center;gap:2px;color:#9a856a}.on-compare-mark span{font:500 9px 'DM Mono';text-transform:uppercase}.on-cloud-actions{border-top:1px solid #e8dcc7;padding-top:14px;display:flex;align-items:center;justify-content:space-between;gap:14px}.on-cloud-actions p{font-size:11px;line-height:1.5;color:var(--on-muted);margin:0;max-width:500px}.on-cloud-buttons{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex:none}.on-conflict{margin-top:17px;padding:14px;border-radius:12px;border:1.5px solid #d8c8aa;background:#fbf3e3}.on-conflict__heading{display:flex;align-items:center;gap:10px;margin-bottom:13px}.on-conflict__heading strong,.on-conflict__heading small{display:block}.on-conflict__heading strong{font:600 15px 'Fredoka'}.on-conflict__heading small{color:var(--on-muted);font-size:10px;margin-top:3px}.on-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;border:1.5px solid var(--on-ink);box-shadow:2px 2px 0 var(--on-ink)}.on-icon--sage{background:#dce8d4}.on-icon--clay{background:#f4d9c3}.on-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.on-choice{display:grid;grid-template-columns:34px 1fr;gap:3px 9px;text-align:left;padding:12px;border:1.5px solid #d6c5a8;border-radius:10px;background:#fffaf0;color:var(--on-ink)}.on-choice:hover{border-color:var(--on-clay);background:#fff8e8}.on-choice__icon{grid-row:span 2;width:32px;height:32px;border-radius:9px;background:#f3e0c6;display:grid;place-items:center;color:#9e563a}.on-choice strong{font:600 12px 'Fredoka'}.on-choice small{font-size:10px;color:var(--on-muted)}.on-choice em{grid-column:2;font-style:normal;font-size:9px;color:#a05238;font-weight:900;display:flex;align-items:center;gap:4px;margin-top:3px}.on-choice em.is-done{color:#50764b}.on-cancel-choice{margin-top:8px}
.on-later-card{display:flex;align-items:center;gap:13px;padding:16px 19px;background:#e8eee1;margin:20px 0 23px;box-shadow:3px 4px 0 var(--on-ink)}.on-later-card__icon{width:39px;height:39px;display:grid;place-items:center;border:1.5px solid var(--on-ink);border-radius:12px;background:#f4dfb9;flex:none}.on-later-card h3{font:600 16px 'Fredoka';margin:0}.on-later-card p:last-child{font-size:11px;color:#6f725e;margin:4px 0 0;line-height:1.45}.on-later-tag{margin-left:auto;white-space:nowrap;border:1px dashed #879577;border-radius:99px;padding:6px 9px;font-size:9px;font-weight:900;color:#637256}
.on-account-actions{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:17px 20px;background:#fff7e8;box-shadow:3px 4px 0 var(--on-ink)}.on-account-actions h3{font:600 17px 'Fredoka';margin:0}.on-account-actions p:last-child{font-size:10px;line-height:1.5;color:var(--on-muted);max-width:515px;margin:5px 0 0}.on-account-actions__buttons{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.on-delete-confirm{max-width:340px;border:1.5px solid #bd7764;border-radius:10px;padding:10px;background:#fff0e8}.on-delete-confirm strong{font:600 13px 'Fredoka'}.on-delete-confirm p{margin:4px 0 8px!important}.on-delete-confirm>div{display:flex;gap:7px;flex-wrap:wrap}.on-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px 0;color:#8a755b;font-size:10px}.on-footer span:first-child{display:flex;align-items:center;gap:6px}.on-footer svg{color:#6d8665}
.on-profile-form{display:grid;gap:13px;margin-top:19px}.on-profile-form label{display:grid;gap:6px;font-size:11px;font-weight:900}.on-profile-form input{width:100%;min-height:42px;padding:9px 11px;border:1.6px solid #c9b99f;border-radius:9px;background:#fffdf6;color:var(--on-ink);font:700 13px 'Nunito',sans-serif}.on-profile-form input:focus{outline:3px solid #bbd0ae;outline-offset:2px}.on-field-error{color:#a34436;font-weight:800}.on-profile-form .on-button{justify-self:start;margin-top:3px}.on-edit-panel{border-top:1px solid #e5d7bf;padding-top:2px;margin-top:4px}.on-profile-setup,.on-empty,.on-locked{padding:28px;max-width:650px;margin:16px auto 28px}.on-profile-setup h2,.on-empty h2,.on-locked h1{font:600 30px 'Fredoka';margin:8px 0}.on-profile-setup>p:not(.on-eyebrow),.on-empty p,.on-locked>p{font-size:13px;line-height:1.6;color:var(--on-muted)}.on-profile-setup__art{float:right;position:relative;width:100px;height:90px;border-radius:50%;background:#dce8d4;display:grid;place-items:center;margin:0 0 10px 20px}.on-orbit{width:48px;height:54px;border:1.5px solid var(--on-ink);border-radius:44%;background:#f0ba7a;display:grid;place-items:center;font:700 27px 'Fredoka';box-shadow:2px 3px 0 var(--on-ink);transform:rotate(-7deg)}.on-twinkle{position:absolute;right:10px;top:10px;color:#a35238;font:700 20px 'Fredoka'}.on-empty{text-align:center;display:grid;justify-items:center}.on-empty p{max-width:400px}.on-locked{text-align:center;display:grid;justify-items:center}.on-locked h1{font-size:clamp(27px,5vw,40px);max-width:500px}.on-locked>p{max-width:480px}.on-locked .on-button{margin-top:8px}
.on-alert{display:flex;align-items:center;gap:10px;padding:11px 13px;border:1.5px solid #c8a77b;border-radius:10px;margin:12px 0;background:#fff6e7;color:var(--on-ink)}.on-alert>svg{flex:none;color:#a85f3e}.on-alert>div{flex:1}.on-alert strong,.on-alert span{display:block}.on-alert strong{font:600 13px 'Fredoka'}.on-alert span{font-size:10px;color:var(--on-muted);margin-top:3px;line-height:1.4}.on-alert--error{background:#fff0e9;border-color:#d5a091}.on-alert--error>span{flex:1;font-size:11px}.on-alert--error button{border:0;background:none;color:#9d4435;font-size:10px;font-weight:900}.on-progress{position:fixed;z-index:5;left:50%;bottom:16px;transform:translateX(-50%);background:#503626;color:#fff6e5;border:1.5px solid #503626;border-radius:99px;box-shadow:3px 4px 0 #bf6845;padding:10px 15px 10px 25px;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden}.on-progress__bar{position:absolute;left:0;top:0;bottom:0;width:40%;background:#fff9ec26;animation:on-progress 1.4s ease-in-out infinite alternate}.on-toast{position:fixed;z-index:6;left:50%;bottom:18px;transform:translateX(-50%);max-width:calc(100vw - 24px);padding:11px 17px;border:1.5px solid var(--on-ink);border-radius:99px;background:var(--on-ink);color:#fff5df;box-shadow:3px 4px 0 var(--on-clay);font-size:11px;font-weight:900;text-align:center}
.on-loading{padding-top:14px}.on-skeleton{border:1.5px solid #d5c5a9;border-radius:16px;background:#fff7e7;padding:18px;overflow:hidden}.on-skeleton span{display:block;border-radius:9px;background:linear-gradient(90deg,#efe2c8 25%,#f9efd9 50%,#efe2c8 75%);background-size:220% 100%;animation:on-shimmer 1.3s linear infinite}.on-skeleton--hero{height:190px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:center}.on-skeleton--hero span:first-child{grid-row:span 2;width:100%;height:120px}.on-skeleton--hero span:nth-child(2){height:45px}.on-skeleton--hero span:nth-child(3){height:55px}.on-skeleton--row{height:108px;margin-top:16px;display:flex;align-items:center;gap:14px}.on-skeleton--row span:first-child{width:50px;height:50px}.on-skeleton--row span:last-child{height:30px;flex:1}.on-skeleton--save{display:flex;gap:15px;align-items:center;height:120px;margin-bottom:20px}.on-skeleton--save span{height:62px;flex:1}.on-loading-label{display:flex;justify-content:center;align-items:center;gap:8px;margin-top:15px;color:var(--on-muted);font-size:11px}.on-loading-dot{width:7px;height:7px;background:var(--on-clay);border-radius:50%;animation:on-breathe 1.1s ease-in-out infinite alternate}
@keyframes on-shimmer{to{background-position:-220% 0}}@keyframes on-progress{from{transform:translateX(-130%)}to{transform:translateX(260%)}}@keyframes on-breathe{to{opacity:.35;transform:scale(.75)}}
@media(max-width:760px){.on-page{padding:0 14px calc(76px + env(safe-area-inset-bottom))}.on-top{align-items:flex-start;flex-direction:column}.on-session{align-self:flex-start}.on-profile-card{grid-template-columns:96px 1fr}.on-profile-card__body{padding:17px 16px}.on-profile-card__color{min-height:230px}.on-profile-facts{grid-template-columns:1fr 1fr}.on-profile-facts>div:last-child{grid-column:1/-1}.on-profile-foot{align-items:flex-start;flex-direction:column}.on-cloud-actions{align-items:flex-start;flex-direction:column}.on-cloud-buttons{justify-content:flex-start}.on-account-actions{align-items:flex-start;flex-direction:column}.on-account-actions__buttons{justify-content:flex-start}.on-footer{align-items:flex-start;flex-direction:column}.on-later-card{align-items:flex-start;flex-wrap:wrap}.on-later-tag{margin-left:52px}.on-save-compare{grid-template-columns:1fr;gap:9px}.on-compare-mark{display:flex;justify-content:center;align-items:center}.on-compare-mark svg:first-child{transform:rotate(-90deg)}.on-compare-mark svg:last-child{transform:rotate(90deg)}}
@media(max-width:520px){.on-brand{padding-top:17px}.on-brand__section{font-size:11px}.on-profile-card{grid-template-columns:1fr}.on-profile-card__color{min-height:92px;border-right:0;border-bottom:2px solid var(--on-ink)}.on-profile-card__color:before{width:150px;height:150px;top:4px;left:calc(50% - 75px)}.on-profile-card__color:after{width:120%;height:60px;right:-10%;bottom:-30px}.on-profile-card__stamp{width:48px;height:54px;font-size:29px}.on-profile-card__row{align-items:flex-start}.on-profile-card__row h2{font-size:24px}.on-profile-card__row .on-button{font-size:10px;padding:7px}.on-profile-facts{gap:12px 7px}.on-profile-facts>div{gap:6px}.on-fact-icon{width:28px;height:28px}.on-profile-facts small{font-size:9px}.on-profile-facts strong{font-size:12px}.on-code{font-size:11px!important}.on-section-heading{align-items:flex-start;flex-direction:column;gap:9px}.on-section-heading h2{font-size:29px}.on-cloud-card{padding:14px}.on-cloud-card__top{gap:9px}.on-cloud-status{font-size:9px;padding:5px 7px}.on-cloud-mark{width:37px;height:37px}.on-cloud-buttons{width:100%}.on-cloud-buttons .on-button{flex:1}.on-choice-grid{grid-template-columns:1fr}.on-account-actions{padding:15px}.on-account-actions__buttons{width:100%;flex-direction:column;align-items:stretch}.on-account-actions__buttons>.on-button{width:100%}.on-delete-confirm{max-width:none}.on-progress{bottom:calc(12px + env(safe-area-inset-bottom));font-size:10px}.on-toast{bottom:calc(12px + env(safe-area-inset-bottom));border-radius:14px;line-height:1.4}.on-profile-setup,.on-empty,.on-locked{padding:21px}.on-profile-setup__art{width:72px;height:68px}.on-orbit{width:38px;height:43px}.on-top h1{font-size:36px}}
@media(prefers-reduced-motion:reduce){.on-page *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
.on-private-label{display:inline-flex;align-items:center;gap:5px;color:#55724d;font-size:10px;font-weight:900;white-space:nowrap}.on-sync-banner{display:flex;align-items:center;gap:9px;padding:10px 13px;border:1.4px solid #c7b995;border-radius:10px;margin:0 0 12px;background:#f8f0df;color:#695b48;font-size:11px;line-height:1.45}.on-sync-banner svg{flex:none}.on-sync-banner--synced{background:#e8f0e3;border-color:#b8c9ad;color:#4f6d4c}.on-sync-banner--syncing{background:#fff1dc;border-color:#d7b786}.on-sync-banner--conflict,.on-sync-banner--error{background:#fff0e9;border-color:#d9a394;color:#8b4135}
`;
