import { memo, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type CaseData = {
  id: 'agri' | 'rates' | 'shipping';
  title: string;
  tags: string[];
  note: string;
  series: number[]; // Índice normalizado (100 = inicio del periodo)
  periodLabel: string;
};

const CauseEffectChains = memo(() => {
  const [scenario, setScenario] = useState<'agri' | 'rates' | 'shipping'>('agri');

  // Variants per card (simulated real-world cases)
  const variants: Record<'agri'|'rates'|'shipping', Omit<CaseData,'id'>[]> = useMemo(() => ({
    agri: [
      {
        title: 'Brazil: drought and soybean prices',
        tags: ['Agriculture', 'Commodities', 'Inflation'],
        note: 'Crop cuts push futures higher and add CPI pressure in the region.',
        series: [100, 99, 101, 103, 104, 102, 105],
        periodLabel: 'Last 3 months',
      },
      {
        title: 'Argentina: corn yields and export volumes',
        tags: ['Agriculture', 'Trade'],
        note: 'Lower yields reduce exports; regional supply tightens and prices rise.',
        series: [100, 98, 97, 99, 101, 100, 102],
        periodLabel: 'Last 3 months',
      },
      {
        title: 'Brazil: rainfall anomaly and food CPI',
        tags: ['Climate', 'Prices'],
        note: 'Rainfall anomalies increase food CPI volatility across metro baskets.',
        series: [100, 101, 102, 103, 102, 104, 105],
        periodLabel: 'Last 2 months',
      },
    ],
    rates: [
      {
        title: 'US: rate hikes and stronger dollar',
        tags: ['Rates', 'FX', 'Financing'],
        note: 'Restrictive cycle strengthens USD; financing costs rise in EM.',
        series: [100, 102, 104, 106, 105, 107, 106],
        periodLabel: 'Last 6 months',
      },
      {
        title: 'EM: sovereign spreads and issuance',
        tags: ['Debt', 'EM'],
        note: 'Wider spreads slow issuance; refinancing costs climb for high beta EMs.',
        series: [100, 101, 103, 104, 104, 103, 105],
        periodLabel: 'Last 6 months',
      },
      {
        title: 'US: mortgage rates and housing activity',
        tags: ['Rates', 'Housing'],
        note: 'Higher mortgage rates cool housing starts and transaction volumes.',
        series: [100, 101, 101, 100, 99, 98, 97],
        periodLabel: 'Last 6 months',
      },
    ],
    shipping: [
      {
        title: 'Red Sea: disruptions and logistics costs',
        tags: ['Shipping', 'Trade', 'Food prices'],
        note: 'Rerouting and delays lift freight and insurance; imported staples face pressure.',
        series: [100, 105, 115, 122, 118, 120, 124],
        periodLabel: 'Last 4 months',
      },
      {
        title: 'Container rates: trans-Pacific lanes',
        tags: ['Shipping', 'Logistics'],
        note: 'Peak season demand and capacity shifts elevate container rates.',
        series: [100, 104, 110, 113, 111, 115, 118],
        periodLabel: 'Last 4 months',
      },
      {
        title: 'Port congestion: dwell times and delays',
        tags: ['Ports', 'Logistics'],
        note: 'Congestion increases dwell times; supply chains adjust lead times upward.',
        series: [100, 102, 108, 106, 107, 109, 110],
        periodLabel: 'Last 4 months',
      },
    ],
  }), []);

  // Auto-rotation ticker
  const [cycleIndex, setCycleIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setCycleIndex((i) => i + 1);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Sync header selector with rotation
  useEffect(() => {
    const order: ('agri'|'rates'|'shipping')[] = ['agri', 'rates', 'shipping'];
    setScenario(order[cycleIndex % order.length]);
  }, [cycleIndex]);

  // Build current cases for the three cards using variant index per id
  const cases: CaseData[] = useMemo(() => {
    const agriVar = variants.agri[cycleIndex % variants.agri.length];
    const ratesVar = variants.rates[cycleIndex % variants.rates.length];
    const shipVar = variants.shipping[cycleIndex % variants.shipping.length];
    return [
      { id: 'agri', ...agriVar },
      { id: 'rates', ...ratesVar },
      { id: 'shipping', ...shipVar },
    ];
  }, [cycleIndex, variants]);

  return (
    <div className="w-full h-full text-white">
      <div className="relative bg-gradient-to-br from-slate-900/70 via-indigo-900/50 to-purple-900/50 rounded-3xl border-2 border-white/20 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative z-10 px-6 pt-6 pb-2 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="text-left">
              <h3 className="text-2xl font-semibold">Cause–Effect Chains — How the world connects</h3>
              <p className="text-white/70 text-sm mt-1">Discover how AI maps causal links across economics, climate, and finance.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Model Status</div>
              <div className="text-sm font-semibold text-emerald-300">Active — mapping causal links</div>
              {/* Scenario selector — updated concepts and darker styling */}
              <div className="mt-2 inline-flex items-center gap-2 bg-slate-900/40 border border-white/10 rounded-full p-1">
                {([
                  { key: 'agri', label: 'Commodities' },
                  { key: 'rates', label: 'Rates & FX' },
                  { key: 'shipping', label: 'Logistics' },
                ] as { key: 'agri'|'rates'|'shipping'; label: string }[]).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setScenario(opt.key)}
                    className={`px-4 py-1 text-xs rounded-full border transition ${
                      scenario === opt.key
                        ? 'bg-indigo-500/20 text-white border-indigo-400/40'
                        : 'text-white/80 bg-slate-800/40 hover:bg-indigo-400/10 border-white/15'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel de casos reales (reemplaza flechas y puntos) */}
        <div className="relative z-10 p-5">
          <div className="relative rounded-2xl border border-white/15 bg-white/5 overflow-hidden h-60">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 items-stretch">
              {cases.map((c) => {
                const min = Math.min(...c.series);
                const max = Math.max(...c.series);
                const last = c.series[c.series.length - 1];
                const first = c.series[0];
                const changePct = ((last - first) / first) * 100;
                const points = c.series
                  .map((v, i) => {
                    const x = (i / (c.series.length - 1)) * 100;
                    const y = 22 - ((v - min) / (max - min || 1)) * 20;
                    return `${x},${y}`;
                  })
                  .join(' ');
                const active = scenario === c.id;

                return (
                  <motion.button
                    key={c.id}
                    onClick={() => setScenario(c.id)}
                    className={`text-left rounded-xl border ${active ? 'border-white/25 bg-white/10' : 'border-white/10 bg-black/20'} p-2 backdrop-blur-sm hover:bg-white/10 transition transform-gpu h-full min-h-[220px] overflow-hidden flex flex-col`}
                    initial={false}
                    style={{ willChange: 'opacity, transform' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] md:text-[13px] font-semibold leading-tight text-white/90">{c.title}</div>
                      <div className={`text-[11px] ${changePct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%</div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">{t}</span>
                      ))}
                    </div>
                    <div className="mt-2 flex-1">
                      <svg viewBox="0 0 100 24" className="w-full h-8 sm:h-9 md:h-9">
                        <polyline points={points} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <div className="mt-1 text-[9px] leading-tight text-white/80 flex items-center gap-2">
                      <span className="truncate">{c.periodLabel}</span>
                      <span className="opacity-60">•</span>
                      <span className="truncate">Norm. idx</span>
                      <span className="opacity-60">•</span>
                      <span className="truncate">Last: {last.toFixed(0)}</span>
                    </div>
                    <div className="mt-1.5 text-[9px] text-white/70 leading-tight max-h-12 overflow-hidden">{c.note}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Se elimina la leyenda anterior del grafo */}

          {/* Reasoning box — dynamically aligned with active case */}
          <div className="mt-2 bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-white/70 text-sm font-medium">AI Reasoning</span>
            </div>
            {(() => {
              const active = cases.find(c => c.id === scenario);
              if (!active) return null;
              const first = active.series[0];
              const last = active.series[active.series.length - 1];
              const changePct = ((last - first) / first) * 100;
              const confidence = Math.round(65 + Math.min(25, Math.abs(changePct)));
              return (
                <p className="text-white/80 text-sm">
                  The model analyzes "{active.title}". {active.note} Estimated impact change: {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%. Confidence: {confidence}%.
                </p>
              );
            })()}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 px-6 pb-4">
          <div className="flex items-center justify-center text-[12px] text-white/60">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-2" />
            Cases update as new signals arrive
          </div>
        </div>
      </div>
    </div>
  );
});

CauseEffectChains.displayName = 'CauseEffectChains';

export default CauseEffectChains;
