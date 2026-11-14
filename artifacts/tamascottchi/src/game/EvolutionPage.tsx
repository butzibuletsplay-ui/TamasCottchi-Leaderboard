import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Coins, LockKeyhole, Sparkles, Star, Trophy } from 'lucide-react';
import type { FullPetData } from './data';
import { EVOLUTION_STAGES, type EvolutionPurchaseResult } from './evolution';
import { Scottchi } from './Scottchi';
import { playerLevelProgress } from '@workspace/game-economy';

type Props = {
  data: FullPetData;
  level: number;
  onPurchase: () => EvolutionPurchaseResult;
};

export function EvolutionPage({ data, level, onPurchase }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [animatingStage, setAnimatingStage] = useState<number | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);
  const purchasePending = useRef(false);
  const current = EVOLUTION_STAGES[data.evolutionStage - 1] || EVOLUTION_STAGES[0];
  const next = EVOLUTION_STAGES[data.evolutionStage];
  const reachedMax = !next;
  const levelReady = !!next && level >= next.playerLevel;
  const coinsMissing = next ? Math.max(0, next.coinCost - data.coins) : 0;
  const canPurchase = !!next && levelReady && coinsMissing === 0;
  const levelProgress = playerLevelProgress(data.xp);
  const previousLevel = current.playerLevel;
  const levelPercent = !next ? 100 : level >= next.playerLevel
    ? 100
    : Math.max(0, Math.min(100, Math.round(
      ((level - previousLevel + (levelProgress.required ? levelProgress.earned / levelProgress.required : 0))
        / Math.max(1, next.playerLevel - previousLevel)) * 100,
    )));
  const shownStage = animatingStage ?? data.evolutionStage;

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function confirmPurchase() {
    if (!canPurchase || purchasePending.current) return;
    purchasePending.current = true;
    setError('');
    const result = onPurchase();
    if (!result.ok) {
      purchasePending.current = false;
      setError(result.reason === 'level' ? `Dafür brauchst du Spielerlevel ${next!.playerLevel}.`
        : result.reason === 'coins' ? `Es fehlen noch ${Math.max(0, next!.coinCost - data.coins).toLocaleString('de-DE')} Münzen.`
          : 'Alle Evolutionsstufen sind bereits erreicht.');
      return;
    }
    setConfirming(false);
    setAnimatingStage(result.stage.stage);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setAnimatingStage(null);
      purchasePending.current = false;
    }, result.stage.stage >= 8 ? 2800 : 2100);
  }

  return <div className="evolution-page" data-testid="evolution-page">
    <section className="panel evolution-overview">
      <div className="panel-head">
        <div><div className="eyebrow">CHARAKTERPFAD · MANUELL</div><h2 className="panel-title">Entwicklung</h2></div>
        <span className="stat-pill"><Star size={14}/> Stufe {data.evolutionStage} / {EVOLUTION_STAGES.length}</span>
      </div>
      <p className="subline evolution-intro">Scottchi verändert seine Form nur, wenn du die nächste Entwicklung bestätigst und bezahlst. Spielerlevel, Pflege und Zeit lösen keine Entwicklung aus.</p>

      <div className="evolution-forms">
        <article className="evolution-form-card current">
          <span className="evolution-form-label">AKTUELLE FORM</span>
          <div className={`evolution-art stage-${data.evolutionStage}`}>
            <Scottchi mood="happy" equipped={data.equipped} evolutionStage={data.evolutionStage}/>
          </div>
          <h3>{current.name}</h3>
          <span className="evolution-stage-tag">Stufe {current.stage} · freigeschaltet</span>
          <p>{current.reward}</p>
        </article>
        <div className="evolution-arrow" aria-hidden="true"><ArrowRight/></div>
        <article className={`evolution-form-card next ${reachedMax ? 'is-complete' : ''}`}>
          {reachedMax ? <>
            <span className="evolution-form-label">ENTWICKLUNG ABGESCHLOSSEN</span>
            <div className="evolution-max-mark"><Trophy size={46}/></div>
            <h3>Ultimative Form</h3>
            <span className="evolution-stage-tag">Titel: Ultimative Pfote</span>
            <p>Du kannst weiter bis Spielerlevel 1000 spielen. Es gibt keine automatische weitere Entwicklung.</p>
          </> : <>
            <span className="evolution-form-label">NÄCHSTE FORM</span>
            <div className={`evolution-art stage-${next.stage} ${animatingStage === next.stage ? 'is-animating' : ''}`}>
              <Scottchi mood="happy" equipped={data.equipped} evolutionStage={shownStage} evolving={animatingStage !== null}/>
              {animatingStage !== null && <div className={`evolution-burst power-${animatingStage >= 8 ? 'high' : animatingStage >= 5 ? 'mid' : 'low'}`} aria-hidden="true"><Sparkles/></div>}
            </div>
            <h3>{next.name}</h3>
            <span className="evolution-stage-tag">Stufe {next.stage} · Spielerlevel {next.playerLevel}</span>
            <p>{next.reward}</p>
          </>}
        </article>
      </div>

      {!reachedMax && <div className="evolution-requirements">
        <div className="evolution-requirement-head">
          <strong>Freischaltung Stufe {next.stage}</strong>
          <span>{levelReady ? 'Level erreicht' : `${Math.max(0, next.playerLevel - level)} Level fehlen`}</span>
        </div>
        <div className="progress-track evolution-progress"><span style={{ width: `${levelPercent}%` }}/></div>
        <div className="evolution-costs">
          <span><Star size={14}/> Spielerlevel {level} / {next.playerLevel}</span>
          <span className={coinsMissing ? 'missing-coins' : ''}><Coins size={14}/> {data.coins.toLocaleString('de-DE')} / {next.coinCost.toLocaleString('de-DE')} Münzen</span>
        </div>
        {coinsMissing > 0 && <p className="evolution-warning" data-testid="evolution-coins-missing">Noch {coinsMissing.toLocaleString('de-DE')} Münzen benötigt.</p>}
        {!levelReady && <p className="evolution-warning">Ab Spielerlevel {next.playerLevel} kannst du diese Entwicklung kaufen.</p>}
        {error && <p className="evolution-warning" role="alert">{error}</p>}
        <button
          className="button orange evolution-buy"
          onClick={() => { setError(''); setConfirming(true); }}
          disabled={!canPurchase || animatingStage !== null}
          data-testid="button-evolve"
        >
          <Sparkles size={16}/>{animatingStage !== null ? 'Scottchi entwickelt sich …' : canPurchase ? 'Weiterentwickeln' : !levelReady ? `Ab Level ${next.playerLevel}` : 'Münzen sammeln'}
        </button>
      </div>}
    </section>

    <section className="panel evolution-path">
      <div className="panel-head"><h2 className="panel-title">Alle zehn Stufen</h2><span className="eyebrow">EINMALIG · DAUERHAFT</span></div>
      <div className="evolution-stage-list">
        {EVOLUTION_STAGES.map((stage) => {
          const isReached = stage.stage <= data.evolutionStage;
          const isNext = stage.stage === data.evolutionStage + 1;
          return <div key={stage.stage} className={`evolution-stage-row ${isReached ? 'reached' : ''} ${isNext ? 'up-next' : ''}`} data-testid={`evolution-stage-${stage.stage}`}>
            <span className="evolution-stage-number">{isReached ? <Check size={15}/> : isNext ? <Star size={14}/> : <LockKeyhole size={13}/>}</span>
            <span className="evolution-stage-copy"><b>{stage.stage}. {stage.name}</b><small>Spielerlevel {stage.playerLevel} · {stage.coinCost ? `${stage.coinCost.toLocaleString('de-DE')} Münzen` : 'kostenlos'}</small></span>
            <span className="evolution-stage-status">{isReached ? 'Erreicht' : isNext ? 'Als Nächstes' : 'Gesperrt'}</span>
          </div>;
        })}
      </div>
    </section>

    <p className="evolution-art-note">Die vorhandenen sieben Scottchi-Bilder sind Stimmungsvarianten desselben Charakters. Bis eigene Formgrafiken vorliegen, zeigen sie die Entwicklung mit abgestuften visuellen Effekten und passenden Animationen.</p>

    {confirming && next && <div className="dialog-backdrop" onClick={() => setConfirming(false)}>
      <section className="dialog evolution-confirm" role="dialog" aria-modal="true" aria-labelledby="evolution-confirm-title" onClick={(event) => event.stopPropagation()}>
        <div className="evolution-confirm-mark"><Sparkles size={24}/></div>
        <h2 id="evolution-confirm-title">Scottchi weiterentwickeln?</h2>
        <p>Stufe {next.stage}: <strong>{next.name}</strong>. Dabei werden <strong>{next.coinCost.toLocaleString('de-DE')} Münzen</strong> einmalig abgezogen. Die Entwicklung bleibt dauerhaft gespeichert.</p>
        {error && <p className="evolution-warning" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="button ghost" onClick={() => setConfirming(false)} data-testid="button-cancel-evolution">Noch nicht</button>
          <button className="button orange" onClick={confirmPurchase} data-testid="button-confirm-evolution"><Coins size={14}/> Für {next.coinCost.toLocaleString('de-DE')} entwickeln</button>
        </div>
      </section>
    </div>}
  </div>;
}
