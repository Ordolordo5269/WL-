import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { InsightData } from './useGenerateInsight';

interface Props {
  data: InsightData;
}

function relevanceBadge(relevance: number) {
  if (relevance >= 0.7) return { label: 'High', color: '#22c55e' };
  if (relevance >= 0.4) return { label: 'Medium', color: '#f59e0b' };
  return { label: 'Low', color: '#6b7280' };
}

export default function InsightResult({ data }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">
            AI Summary
          </h3>
          <span className="text-xs text-slate-500 ml-auto">
            {new Date(data.generatedAt).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {data.summary}
        </p>
      </div>

      {/* Evidence */}
      {data.evidence.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">
            Evidence ({data.evidence.length})
          </h3>
          <div className="space-y-2">
            {data.evidence.map((ev, i) => {
              const badge = relevanceBadge(ev.relevance);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                      {ev.source}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{ev.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
