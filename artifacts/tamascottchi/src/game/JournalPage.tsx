import { BookOpen, Sparkles } from 'lucide-react';
import type { FullPetData } from './data';

export function JournalPage({ data }: { data: FullPetData }) {
  const entries = [...data.journal].sort((a, b) => b.date - a.date);
  return <section className="panel journal-page" data-testid="journal-page">
    <div className="panel-head"><div><div className="eyebrow">ERINNERUNGEN AUS DEINEM ABENTEUER</div><h2 className="panel-title">Scottchis Tagebuch</h2></div><BookOpen size={19}/></div>
    <div className="journal-cover"><Sparkles size={18}/><span>Jeder Fund, jede Aufgabe und jedes selbstgemachte Stück bleibt hier festgehalten.</span></div>
    {entries.length ? <ol className="journal-list">{entries.map((entry) => <li key={entry.id} data-testid="journal-entry"><span className="journal-icon">{entry.icon}</span><div><strong>{entry.title}</strong><p>{entry.detail}</p><time dateTime={new Date(entry.date).toISOString()}>{new Date(entry.date).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</time></div></li>)}</ol> : <div className="empty-state"><BookOpen size={30}/><p>Dein Abenteuer beginnt hier. Erste Weltfunde, Quests und hergestellte Gegenstände erscheinen automatisch im Tagebuch.</p></div>}
  </section>;
}
