import { useEffect, useMemo, useRef, useState } from 'react';
import { MOODS, type Mood } from './assets';
import { Scottchi } from './Scottchi';
import {
  ANCHOR_NAMES, BASE_CONFIG, SLOT_OF, WEARABLES, cloneConfig, readDevConfig, resolveFit, validateConfig, writeDevConfig,
  type AnchorName, type OutfitConfig, type OutfitTransform,
} from './outfits';

type Field = Exclude<keyof OutfitTransform, 'anchor'>;
const FIELDS: { f: Field; min: number; max: number; step: number }[] = [
  { f: 'x', min: -40, max: 40, step: 0.5 }, { f: 'y', min: -40, max: 40, step: 0.5 },
  { f: 'scaleX', min: 5, max: 110, step: 0.5 }, { f: 'scaleY', min: 0.5, max: 1.6, step: 0.01 },
  { f: 'rotation', min: -45, max: 45, step: 0.5 }, { f: 'zIndex', min: 1, max: 12, step: 1 },
];
const COMBOS: { id: string; items: string[] }[] = [
  { id: 'Regentag', items: ['raincoat', 'bucket-hat', 'scarf'] },
  { id: 'Gute Nacht', items: ['pajamas', 'sleep-cap'] },
  { id: 'Gala', items: ['tuxedo', 'crown', 'bow'] },
  { id: 'Held', items: ['cape', 'wizard-hat', 'collar'] },
  { id: 'Freizeit', items: ['hoodie', 'baseballcap', 'sunglasses'] },
  { id: 'Ringel', items: ['striped-shirt', 'beanie', 'scarf'] },
];

/** DEV only. Reachable with ?outfitEditor=1 or ?outfitGallery=1 on the dev server; tree-shaken checks prevent use in production. */
export function OutfitLab({ initialMode }: { initialMode: 'editor' | 'gallery' }) {
  const [cfg, setCfg] = useState<OutfitConfig>(() => readDevConfig() ?? cloneConfig(BASE_CONFIG));
  const [mode, setMode] = useState(initialMode);
  const [item, setItem] = useState('scarf');
  const [mood, setMood] = useState<Mood>('default');
  const [scope, setScope] = useState<'base' | 'mood'>('base');
  const [extras, setExtras] = useState<string[]>([]);
  const [showAnchors, setShowAnchors] = useState(true);
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { writeDevConfig(cfg); }, [cfg]);

  if (!import.meta.env.DEV) return null;
  const fit = resolveFit(item, mood, cfg)!;
  const setField = (f: Field, v: number) => setCfg((old) => {
    const next = cloneConfig(old);
    const it = next.items[item];
    if (scope === 'base') it.base = { ...it.base, [f]: v };
    else it.moods = { ...it.moods, [mood]: { ...(it.moods[mood] || {}), [f]: v } };
    return next;
  });
  const setAnchor = (a: AnchorName, k: 'x' | 'y' | 'rotation', v: number) => setCfg((old) => {
    const next = cloneConfig(old); next.anchors[mood][a] = { ...next.anchors[mood][a], [k]: v }; return next;
  });
  const clearMood = () => setCfg((old) => { const next = cloneConfig(old); delete next.items[item].moods[mood]; return next; });
  const download = () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'outfit-config.json'; a.click(); URL.revokeObjectURL(a.href);
    setMsg('outfit-config.json heruntergeladen. Ersetze damit src/game/outfit-config.json.');
  };
  const importFile = async (file: File) => {
    try { setCfg(validateConfig(JSON.parse(await file.text()))); setMsg('Konfiguration lokal geladen.'); }
    catch (e) { setMsg(`Import fehlgeschlagen: ${(e as Error).message}`); }
  };
  const anchorName = cfg.items[item].anchor;
  const wear = [...extras.filter((e) => SLOT_OF[e] !== SLOT_OF[item] && e !== item), item];
  const rows = WEARABLES.filter((w) => slotFilter === 'all' || SLOT_OF[w] === slotFilter);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(BASE_CONFIG);

  return <div className="lab" data-testid="outfit-lab">
    <header className="lab-head">
      <div><div className="eyebrow">DEV · Nur lokal · Nie im Spiel sichtbar</div><h1>Outfit-Werkstatt</h1></div>
      <div className="lab-tabs">
        <button className={`room-chip ${mode === 'gallery' ? 'selected' : ''}`} onClick={() => setMode('gallery')} data-testid="lab-tab-gallery">Galerie: alle Teile x alle Stimmungen</button>
        <button className={`room-chip ${mode === 'editor' ? 'selected' : ''}`} onClick={() => setMode('editor')} data-testid="lab-tab-editor">Editor</button>
        <a className="button small" href={window.location.pathname} data-testid="link-lab-exit">Zum Spiel</a>
      </div>
    </header>
    <div className="lab-bar">
      <span className={`best-badge ${dirty ? 'lab-dirty' : ''}`}>{dirty ? 'Lokale Änderungen aktiv' : 'Entspricht eingecheckter Datei'}</span>
      <button className="button small" onClick={download} data-testid="button-lab-export">Config exportieren (JSON)</button>
      <button className="button small" onClick={() => fileRef.current?.click()} data-testid="button-lab-import">JSON laden</button>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }}/>
      <button className="button small ghost" onClick={() => { setCfg(cloneConfig(BASE_CONFIG)); setMsg('Auf eingecheckte Datei zurückgesetzt.'); }} data-testid="button-lab-reset">Lokale Änderungen verwerfen</button>
      {msg && <span className="lab-msg" data-testid="text-lab-msg">{msg}</span>}
    </div>

    {mode === 'gallery' && <section className="panel">
      <div className="lab-tabs" style={{ marginBottom: 10 }}>
        {['all', 'hat', 'outfit', 'neck', 'face'].map((s) => <button key={s} className={`room-chip ${slotFilter === s ? 'selected' : ''}`} onClick={() => setSlotFilter(s)} data-testid={`lab-filter-${s}`}>{s === 'all' ? 'Alle' : s === 'hat' ? 'Hüte' : s === 'outfit' ? 'Jacken' : s === 'neck' ? 'Hals' : 'Gesicht'}</button>)}
      </div>
      <div className="lab-grid" style={{ gridTemplateColumns: `110px repeat(${MOODS.length}, minmax(92px,1fr))` }}>
        <div/>{MOODS.map((m) => <div key={m} className="lab-col-head">{m}</div>)}
        {rows.map((w) => <GalleryRow key={w} label={w} items={[w]} cfg={cfg} onPick={(m) => { setItem(w); setMood(m); setMode('editor'); }}/>)}
        {slotFilter === 'all' && COMBOS.map((c) => <GalleryRow key={c.id} label={`Stil: ${c.id}`} items={c.items} cfg={cfg} onPick={(m) => { setItem(c.items[0]); setExtras(c.items); setMood(m); setMode('editor'); }}/>)}
      </div>
    </section>}

    {mode === 'editor' && <div className="lab-editor">
      <section className="panel lab-stage-wrap">
        <div className="lab-stage"><div className="lab-inner">
          <Scottchi mood={mood} equipped={wear} config={cfg} highlight={item} className="lab-pet"/>
          {showAnchors && ANCHOR_NAMES.map((a) => { const p = cfg.anchors[mood][a]; return <i key={a} className={`lab-anchor ${a === anchorName ? 'on' : ''}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} title={a}/>; })}
          {showAnchors && <i className="lab-pivot" style={{ left: `${fit.left}%`, top: `${fit.top}%` }}/>}
        </div></div>
        <div className="lab-moods">{MOODS.map((m) => <button key={m} className={`lab-mini ${m === mood ? 'on' : ''}`} onClick={() => setMood(m)} data-testid={`lab-mood-${m}`}><Scottchi mood={m} equipped={wear} config={cfg}/><span>{m}</span></button>)}</div>
      </section>
      <section className="panel lab-controls">
        <label className="tuner-row"><span>Teil</span><select value={item} onChange={(e) => setItem(e.target.value)} data-testid="select-lab-item">{WEARABLES.map((w) => <option key={w} value={w}>{w} ({SLOT_OF[w]})</option>)}</select><span/></label>
        <label className="tuner-row"><span>Stimmung</span><select value={mood} onChange={(e) => setMood(e.target.value as Mood)} data-testid="select-lab-mood">{MOODS.map((m) => <option key={m}>{m}</option>)}</select><span/></label>
        <div className="tuner-head">
          <button className={`room-chip ${scope === 'base' ? 'selected' : ''}`} onClick={() => setScope('base')} data-testid="lab-scope-base">Alle Stimmungen</button>
          <button className={`room-chip ${scope === 'mood' ? 'selected' : ''}`} onClick={() => setScope('mood')} data-testid="lab-scope-mood">Nur {mood}</button>
          {cfg.items[item].moods[mood] && <button className="button small ghost" onClick={clearMood} data-testid="button-lab-clear-mood">{mood}-Abweichung löschen</button>}
        </div>
        <div className="lab-note">Anker: <strong>{anchorName}</strong> · Pivot {cfg.items[item].pivotX} / {cfg.items[item].pivotY}</div>
        {FIELDS.map(({ f, min, max, step }) => <label key={f} className="tuner-row"><span>{f}</span>
          <input type="range" min={min} max={max} step={step} value={fit[f]} onChange={(e) => setField(f, Number(e.target.value))} data-testid={`range-lab-${f}`}/>
          <input className="lab-num" type="number" step={step} value={fit[f]} onChange={(e) => setField(f, Number(e.target.value))}/></label>)}
        <div className="lab-note">Anker {anchorName} für {mood} (wirkt auf alle Teile dieses Ankers)</div>
        {(['x', 'y', 'rotation'] as const).map((k) => <label key={k} className="tuner-row"><span>{k}</span>
          <input type="range" min={k === 'rotation' ? -30 : 0} max={k === 'rotation' ? 30 : 100} step={0.5} value={cfg.anchors[mood][anchorName][k]} onChange={(e) => setAnchor(anchorName, k, Number(e.target.value))} data-testid={`range-anchor-${k}`}/>
          <code>{cfg.anchors[mood][anchorName][k]}</code></label>)}
        <label className="tuner-head"><input type="checkbox" checked={showAnchors} onChange={(e) => setShowAnchors(e.target.checked)}/> Ankerpunkte zeigen</label>
        <div className="lab-note">Mit anprobieren:</div>
        <div className="lab-extras">{WEARABLES.filter((w) => w !== item).map((w) => <button key={w} className={`room-chip ${extras.includes(w) ? 'selected' : ''}`} onClick={() => setExtras((x) => x.includes(w) ? x.filter((v) => v !== w) : [...x.filter((v) => SLOT_OF[v] !== SLOT_OF[w]), w])}>{w}</button>)}</div>
        <details className="lab-note"><summary>So landet die Passform im Spiel</summary>
          <ol><li>Teil und Stimmung justieren. Änderungen bleiben lokal im Browser (localStorage).</li><li>"Config exportieren" lädt outfit-config.json herunter.</li><li>Datei nach artifacts/tamascottchi/src/game/outfit-config.json kopieren und einchecken.</li><li>Erst dann sehen Spieler die neue Passform. Das Spiel liest lokale Editorwerte nie.</li></ol>
        </details>
      </section>
    </div>}
  </div>;
}

function GalleryRow({ label, items, cfg, onPick }: { label: string; items: string[]; cfg: OutfitConfig; onPick: (m: Mood) => void }) {
  const equipped = useMemo(() => items, [items]);
  return <>
    <div className="lab-row-head">{label}</div>
    {MOODS.map((m) => <button key={m} className="lab-cell" onClick={() => onPick(m)} title={`${label} · ${m}`} data-testid={`lab-cell-${label}-${m}`}><Scottchi mood={m} equipped={equipped} config={cfg}/></button>)}
  </>;
}
