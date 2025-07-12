import React from 'react';
import type { Conflict } from '../src/types';
import { Users, Home, Calendar, Link, Shield } from 'lucide-react';

interface ConflictStatsProps {
  conflict: Conflict;
}

const iconSize = 36;
const CARD_MIN_HEIGHT = '88px';

const ConflictStats: React.FC<ConflictStatsProps> = ({ conflict }) => {
  if (!conflict.casualtiesDetailed && !conflict.displacedPersons) {
    return null;
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  return (
    <div
      className="conflict-stats min-h-[420px] max-h-[600px] py-8 px-0 flex flex-col font-sans text-[15px] overflow-y-auto"
      style={{ overflowX: 'hidden' }}
    >
      <h3 className="text-lg font-semibold mb-6 text-gray-200">Estadísticas Detalladas</h3>
      <div className="flex flex-col gap-7 flex-1 w-full">
        {/* Víctimas Militares */}
        {conflict.casualtiesDetailed?.military && (
          <div
            className="stat bg-slate-800 rounded-lg px-6 py-4 flex items-center gap-4 w-full shadow"
            style={{ minHeight: CARD_MIN_HEIGHT }}
          >
            <div className="stat-figure text-blue-400 flex-shrink-0">
              <Shield size={iconSize} />
            </div>
            <div className="flex flex-col justify-center flex-1">
              <div className="stat-title text-sm text-blue-300 font-semibold uppercase tracking-wide mb-1">Militares</div>
              <div className="stat-value text-3xl text-blue-100 font-bold mb-1 leading-tight">{formatNumber(Object.values(conflict.casualtiesDetailed.military).reduce((sum, val) => sum + val, 0))}</div>
              <div className="stat-desc text-sm text-blue-400 mt-1 font-normal">Ucrania: {formatNumber(conflict.casualtiesDetailed.military.ukraine)} | Rusia: {formatNumber(conflict.casualtiesDetailed.military.russia)}</div>
            </div>
          </div>
        )}
        {/* Víctimas Civiles */}
        {conflict.casualtiesDetailed?.civilian && (
          <div
            className="stat bg-slate-800 rounded-lg px-6 py-4 flex items-center gap-4 w-full shadow"
            style={{ minHeight: CARD_MIN_HEIGHT }}
          >
            <div className="stat-figure text-red-400 flex-shrink-0">
              <Users size={iconSize} />
            </div>
            <div className="flex flex-col justify-center flex-1">
              <div className="stat-title text-sm text-red-300 font-semibold uppercase tracking-wide mb-1">Civiles</div>
              <div className="stat-value text-3xl text-red-100 font-bold mb-1 leading-tight">{formatNumber(conflict.casualtiesDetailed.civilian.total)}</div>
              <div className="stat-desc text-sm text-red-400 mt-1 font-normal">Total de civiles fallecidos</div>
            </div>
          </div>
        )}
        {/* Personas Desplazadas */}
        {conflict.displacedPersons && (
          <div
            className="stat bg-slate-800 rounded-lg px-6 py-4 flex items-center gap-4 w-full shadow"
            style={{ minHeight: CARD_MIN_HEIGHT }}
          >
            <div className="stat-figure text-yellow-400 flex-shrink-0">
              <Home size={iconSize} />
            </div>
            <div className="flex flex-col justify-center flex-1">
              <div className="stat-title text-sm text-yellow-300 font-semibold uppercase tracking-wide mb-1">Desplazados</div>
              <div className="stat-value text-3xl text-yellow-100 font-bold mb-1 leading-tight">{formatNumber(conflict.displacedPersons)}</div>
              <div className="stat-desc text-sm text-yellow-400 mt-1 font-normal">Refugiados y desplazados</div>
            </div>
          </div>
        )}
        {/* Fechas Clave */}
        {(conflict.startDate || conflict.escalationDate) && (
          <div
            className="stat bg-slate-800 rounded-lg px-6 py-4 flex items-center gap-4 w-full shadow"
            style={{ minHeight: CARD_MIN_HEIGHT }}
          >
            <div className="stat-figure text-purple-400 flex-shrink-0">
              <Calendar size={iconSize} />
            </div>
            <div className="flex flex-col justify-center flex-1">
              <div className="stat-title text-sm text-purple-300 font-semibold uppercase tracking-wide mb-1">Fechas Clave</div>
              <div className="stat-value text-2xl text-purple-100 font-bold mb-1 leading-tight">{conflict.startDate ? new Date(conflict.startDate).toLocaleDateString('es-ES') : ''}</div>
              <div className="stat-desc text-sm text-purple-400 mt-1 font-normal">
                {conflict.escalationDate && <>Escalación: {new Date(conflict.escalationDate).toLocaleDateString('es-ES')}</>}
              </div>
            </div>
          </div>
        )}
        {/* Fuentes */}
        {conflict.sources && conflict.sources.length > 0 && (
          <div
            className="stat bg-slate-800 rounded-lg px-6 py-4 flex items-center gap-4 w-full shadow"
            style={{ minHeight: CARD_MIN_HEIGHT }}
          >
            <div className="stat-figure text-cyan-400 flex-shrink-0">
              <Link size={iconSize} />
            </div>
            <div className="flex flex-col justify-center flex-1">
              <div className="stat-title text-sm text-cyan-300 font-semibold uppercase tracking-wide mb-1">Fuentes</div>
              <div className="stat-value text-base text-cyan-100 font-semibold truncate max-w-xs">{conflict.sources.join(', ')}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictStats; 