import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ORGANIZATIONS, type OrgMeta } from './services/orgs-config';
import { buildOrgHighlight } from './services/orgs-service';

interface Props {
  onSetOrganizationIsoFilter?: (iso3: string[], colorHex?: string) => void;
}

type GroupKey = 'united_nations' | 'regional_orgs' | 'trade_orgs' | 'security_orgs';

export default function InternationalOrganizationsPanel({ onSetOrganizationIsoFilter }: Props) {
  const [query, setQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [isoToColor, setIsoToColor] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const un: OrgMeta[] = [];
    const regional: OrgMeta[] = [];
    const trade: OrgMeta[] = [];
    const security: OrgMeta[] = [];
    const s = query.trim().toLowerCase();
    for (const o of ORGANIZATIONS) {
      const matches = !s || o.name.toLowerCase().includes(s) || o.shortName.toLowerCase().includes(s) || (o.aliases || []).some(a => a.toLowerCase().includes(s));
      if (!matches) continue;
      const key = String(o.key || '').toLowerCase();
      if (key === 'un' || key.startsWith('un ') || key.startsWith('un-') || key.startsWith('who') || key.startsWith('unesco') || key.startsWith('unicef') || key.startsWith('wfp')) {
        un.push(o);
        continue;
      }
      const cat = (o.category || '').toLowerCase();
      if (cat.includes('regional')) { regional.push(o); continue; }
      if (cat.includes('economic') || cat.includes('trade')) { trade.push(o); continue; }
      if (cat.includes('security') || cat.includes('defense')) { security.push(o); continue; }
      if (key === 'eu' || key === 'asean' || key === 'au' || key === 'oas' || key === 'ecowas' || key === 'sadc' || key === 'mercosur') { regional.push(o); continue; }
      if (key === 'wto' || key === 'nafta' || key === 'usmca' || key === 'efta') { trade.push(o); continue; }
      if (key === 'nato' || key === 'sco' || key === 'csto') { security.push(o); continue; }
      regional.push(o);
    }
    return { un, regional, trade, security };
  }, [query]);

  async function applySelectionChange(orgKey: string, checked: boolean) {
    const newSelected = new Set(selectedKeys);
    if (checked) newSelected.add(orgKey); else newSelected.delete(orgKey);
    setSelectedKeys(newSelected);

    const meta = ORGANIZATIONS.find(o => o.key === orgKey);
    if (!meta) {
      console.warn(`Organization ${orgKey} not found in config`);
      return;
    }
    const orgColor = meta.color || '#22c55e';

    let nextIsoMap: Record<string, string> = {};
    if (checked) {
      setLoadingKeys(prev => new Set([...prev, orgKey]));
      try {
        const { iso3 } = await buildOrgHighlight(orgKey as any);
        nextIsoMap = { ...isoToColor };
        for (const i of iso3) {
          const isoUpper = i.toUpperCase();
          if (!nextIsoMap[isoUpper]) {
            nextIsoMap[isoUpper] = orgColor;
          }
        }
      } finally {
        setLoadingKeys(prev => { const n = new Set(prev); n.delete(orgKey); return n; });
      }
    } else {
      const remainingKeys = Array.from(newSelected);
      const rebuilt: Record<string, string> = {};
      for (const k of remainingKeys) {
        const kMeta = ORGANIZATIONS.find(o => o.key === k);
        if (!kMeta) continue;
        const kColor = kMeta.color || '#22c55e';
        setLoadingKeys(prev => new Set([...prev, k]));
        try {
          const { iso3 } = await buildOrgHighlight(k as any);
          for (const i of iso3) {
            const isoUpper = i.toUpperCase();
            if (!rebuilt[isoUpper]) {
              rebuilt[isoUpper] = kColor;
            }
          }
        } catch {}
        finally {
          setLoadingKeys(prev => { const n = new Set(prev); n.delete(k); return n; });
        }
      }
      nextIsoMap = rebuilt;
    }
    setIsoToColor(nextIsoMap);

    const normalizedMap: Record<string, string> = {};
    for (const [iso, color] of Object.entries(nextIsoMap)) {
      const normalizedColor = color.startsWith('#') ? color.toUpperCase() : `#${color.toUpperCase()}`;
      normalizedMap[iso] = normalizedColor;
    }

    try {
      const windowMapRef = (window as any).__wl_mapRef;
      if (windowMapRef && windowMapRef.highlightIso3ToColorMap) {
        console.log('[IOP] Applying colors to map via window:', normalizedMap);
        windowMapRef.highlightIso3ToColorMap(normalizedMap);
        return;
      }
      const docMapRef = (document as any).__wl_map_comp;
      if (docMapRef && docMapRef.highlightIso3ToColorMap) {
        console.log('[IOP] Applying colors to map via document:', normalizedMap);
        docMapRef.highlightIso3ToColorMap(normalizedMap);
        return;
      }
      console.warn('[IOP] Map ref not available', {
        hasWindowRef: !!windowMapRef,
        hasDocRef: !!docMapRef
      });
    } catch (err) {
      console.error('[IOP] Error updating map:', err);
    }
    if (onSetOrganizationIsoFilter) {
      try {
        onSetOrganizationIsoFilter(Object.keys(normalizedMap));
      } catch {}
    }
  }

  function ChipGroup({ title, items }: { title: string; items: OrgMeta[] }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: '#64748b',
          marginBottom: 8,
          paddingLeft: 2
        }}>
          {title}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((o) => {
            const isChecked = selectedKeys.has(o.key);
            const isLoading = loadingKeys.has(o.key);
            return (
              <button
                key={o.key}
                title={o.name}
                onClick={async () => { await applySelectionChange(o.key, !isChecked); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderLeft: `3px solid ${o.color}`,
                  ...(isChecked ? {
                    background: `${o.color}25`,
                    border: `1px solid ${o.color}90`,
                    borderLeft: `3px solid ${o.color}`,
                    color: '#f1f5f9',
                    boxShadow: `0 0 10px ${o.color}20`,
                  } : {
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    borderLeft: `3px solid ${o.color}`,
                    color: '#cbd5e1',
                  }),
                  ...(isLoading ? { opacity: 0.7 } : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.borderColor = `${o.color}70`;
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
                    e.currentTarget.style.borderLeft = `3px solid ${o.color}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isChecked) {
                    e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                    e.currentTarget.style.borderLeft = `3px solid ${o.color}`;
                  }
                }}
              >
                {o.shortName}
                {isLoading && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>...</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search organizations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search organizations"
          style={{
            width: '100%',
            padding: '10px 12px 10px 36px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(71, 85, 105, 0.55)',
            borderRadius: 10,
            fontSize: 14,
            color: '#e2e8f0',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
            e.target.style.background = 'rgba(15, 23, 42, 0.8)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(71, 85, 105, 0.55)';
            e.target.style.background = 'rgba(15, 23, 42, 0.6)';
          }}
        />
      </div>

      <div
        className="iop-scrollable"
        style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 12, paddingRight: 4 }}
      >
        <style>{`
          .iop-scrollable::-webkit-scrollbar { width: 6px; }
          .iop-scrollable::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.3); border-radius: 3px; }
          .iop-scrollable::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.4); border-radius: 3px; }
          .iop-scrollable::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.6); }
          .iop-scrollable { scrollbar-width: thin; scrollbar-color: rgba(59, 130, 246, 0.4) rgba(15, 23, 42, 0.3); }
        `}</style>
        <ChipGroup title="United Nations" items={groups.un} />
        <ChipGroup title="Regional" items={groups.regional} />
        <ChipGroup title="Trade" items={groups.trade} />
        <ChipGroup title="Security" items={groups.security} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          {selectedKeys.size === 0 ? 'No organizations selected' : `${selectedKeys.size} ${selectedKeys.size === 1 ? 'organization' : 'organizations'} selected`}
        </div>
        <button
          onClick={() => {
            setSelectedKeys(new Set());
            setIsoToColor({});
            try { (window as any).__wl_mapRef?.highlightIso3ToColorMap?.({}); } catch {}
            try { onSetOrganizationIsoFilter?.([]); } catch {}
          }}
          className="settings-chip"
          style={{ padding: '8px 14px', justifyContent: 'center' }}
        >Clear</button>
      </div>
    </div>
  );
}
