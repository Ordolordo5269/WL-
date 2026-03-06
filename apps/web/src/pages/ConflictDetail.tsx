import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users, Shield } from 'lucide-react';
import { useConflictDetail } from '../features/conflicts/useConflictDetail';
import ConflictTimeline from '../features/conflicts/ConflictTimeline';
import { statusToSeverity, severityColor, statusLabel } from '../features/conflicts/types';

export default function ConflictDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: conflict, isLoading, error } = useConflictDetail(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !conflict) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-red-400">Conflict not found</p>
        <button
          onClick={() => navigate('/conflicts')}
          className="text-sm text-blue-400 hover:underline"
        >
          Back to conflicts
        </button>
      </div>
    );
  }

  const severity = statusToSeverity(conflict.status);
  const color = severityColor(severity);
  const totalCasualties = conflict.casualties.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <button
          onClick={() => navigate('/conflicts')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to conflicts
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {statusLabel(conflict.status)}
            </span>
            <span className="text-xs text-slate-500">{conflict.conflictType}</span>
          </div>
          <h1 className="text-3xl font-bold">{conflict.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {conflict.country}, {conflict.region}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Started {new Date(conflict.startDate).toLocaleDateString()}
            </span>
            {totalCasualties > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {totalCasualties.toLocaleString()} casualties
              </span>
            )}
          </div>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5"
        >
          <p className="text-sm text-slate-300 leading-relaxed">{conflict.description}</p>
        </motion.div>

        {/* Factions */}
        {conflict.factions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> Factions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conflict.factions.map(faction => (
                <div
                  key={faction.id}
                  className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {faction.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: faction.color }}
                      />
                    )}
                    <span className="text-sm font-semibold text-white">{faction.name}</span>
                  </div>
                  {faction.goals.length > 0 && (
                    <p className="text-xs text-slate-400 mb-1">
                      Goals: {faction.goals.join(', ')}
                    </p>
                  )}
                  {faction.allies.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Allies: {faction.allies.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4">Event Timeline</h2>
          <ConflictTimeline events={conflict.events} />
        </motion.div>

        {/* News */}
        {conflict.news.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-semibold mb-3">Related News</h2>
            <div className="space-y-2">
              {conflict.news.slice(0, 10).map(article => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/60 p-3 transition-colors"
                >
                  <p className="text-sm font-medium text-white">{article.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {article.source} &middot; {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
