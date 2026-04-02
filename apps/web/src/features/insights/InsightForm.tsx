import { useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { CountryEntity } from './useCountryEntities';

interface Props {
  conflicts: Array<{ id: string; name: string }>;
  countries: CountryEntity[];
  isLoading: boolean;
  onSubmit: (data: { entityType: 'conflict' | 'country'; entityId: string; question?: string }) => void;
}

export default function InsightForm({ conflicts, countries, isLoading, onSubmit }: Props) {
  const { isAuthenticated } = useAuth();
  const [entityType, setEntityType] = useState<'conflict' | 'country'>('conflict');
  const [entityId, setEntityId] = useState('');
  const [question, setQuestion] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-8 text-center">
        <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <p className="text-sm text-slate-400">You must be logged in to generate insights.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId) return;
    onSubmit({ entityType, entityId, question: question || undefined });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Entity Type</label>
          <select
            value={entityType}
            onChange={e => {
              setEntityType(e.target.value as 'conflict' | 'country');
              setEntityId('');
            }}
            className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
          >
            <option value="conflict">Conflict</option>
            <option value="country">Country</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400 uppercase tracking-wider">
            {entityType === 'conflict' ? 'Conflict' : 'Country'}
          </label>
          <select
            value={entityId}
            onChange={e => setEntityId(e.target.value)}
            className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2"
          >
            <option value="">Select...</option>
            {entityType === 'conflict'
              ? conflicts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              : countries.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.iso3 ? ` (${c.iso3})` : ''}
                  </option>
                ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400 uppercase tracking-wider">
          Question (optional)
        </label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. What are the key escalation factors?"
          rows={3}
          className="rounded-lg bg-slate-700 border-slate-600 text-sm text-white px-3 py-2 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={!entityId || isLoading}
        className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-sm font-medium text-white px-4 py-2 transition-colors"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        Generate Insight
      </button>
    </form>
  );
}
