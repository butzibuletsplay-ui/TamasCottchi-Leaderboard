import type { FullPetData, JournalEntry } from './data';

export function recordJournal(data: FullPetData, id: string, icon: string, title: string, detail: string): FullPetData {
  if (data.journal.some((entry) => entry.id === id)) return data;
  const entry: JournalEntry = { id, date: Date.now(), icon, title, detail };
  return { ...data, journal: [...data.journal, entry].slice(-100) };
}
