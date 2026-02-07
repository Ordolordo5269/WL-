import React, { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ORGANIZATIONS, type OrgMeta } from '../services/orgs-config';
import { buildOrgHighlight } from '../services/orgs-service';

interface Props {
  onSetOrganizationIsoFilter?: (iso3: string[], colorHex?: string) => void;
}

type GroupKey = 'united_nations' | 'regional_orgs' | 'trade_orgs' | 'security_orgs';

export default function InternationalOrganizationsPanel({ onSetOrganizationIsoFilter }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<GroupKey, boolean>>({
    united_nations: false,
    regional_orgs: false,
    trade_orgs: false,
    security_orgs: false
  });
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
      // Basic search across name and aliases
      const matches = !s || o.name.toLowerCase().includes(s) || (o.aliases || []).some(a => a.toLowerCase().includes(s));
      if (!matches) continue;
      const key = String(o.key || '').toLowerCase();
      if (key === 'un' || key.startsWith('un ' ) || key.startsWith('un-') || key.startsWith('who') || key.startsWith('unesco') || key.startsWith('unicef') || key.startsWith('wfp')) {
        un.push(o);
        continue;
      }
      // Map categories to UI groups
      const cat = (o.category || '').toLowerCase();
      if (cat.includes('regional')) { regional.push(o); continue; }
      if (cat.includes('economic') || cat.includes('trade')) { trade.push(o); continue; }
      if (cat.includes('security') || cat.includes('defense')) { security.push(o); continue; }
      // Fallback heuristics
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

    // Get organization metadata
    const meta = ORGANIZATIONS.find(o => o.key === orgKey);
    if (!meta) {
      console.warn(`Organization ${orgKey} not found in config`);
      return;
    }
    const orgColor = meta.color || '#22c55e';

    // Fetch/update iso map incrementally
    let nextIsoMap: Record<string, string> = {};
    if (checked) {
      // Add the new organization - preserve existing colors for countries already colored
      setLoadingKeys(prev => new Set([...prev, orgKey]));
      try {
        const { iso3 } = await buildOrgHighlight(orgKey as any);
        // Merge with existing selections, but don't overwrite existing colors
        nextIsoMap = { ...isoToColor };
        for (const i of iso3) {
          const isoUpper = i.toUpperCase();
          // Only set color if country not already colored (first org selected wins for overlapping countries)
          if (!nextIsoMap[isoUpper]) {
            nextIsoMap[isoUpper] = orgColor;
          }
        }
      } finally {
        setLoadingKeys(prev => { const n = new Set(prev); n.delete(orgKey); return n; });
      }
    } else {
      // Rebuild completely from remaining selections to ensure removed countries are cleared
      // Process in selection order to maintain consistent coloring for overlapping countries
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
            // First org processed wins for overlapping countries
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

    // Normalize all colors to uppercase and ensure they're valid hex
    const normalizedMap: Record<string, string> = {};
    for (const [iso, color] of Object.entries(nextIsoMap)) {
      // Ensure color is uppercase and valid hex
      const normalizedColor = color.startsWith('#') ? color.toUpperCase() : `#${color.toUpperCase()}`;
      normalizedMap[iso] = normalizedColor;
    }

    // Apply to map immediately - pass empty object if no selections
    try { 
      // Try window.__wl_mapRef first (the script-generated proxy)
      const windowMapRef = (window as any).__wl_mapRef;
      if (windowMapRef && windowMapRef.highlightIso3ToColorMap) {
        console.log('[IOP] Applying colors to map via window:', normalizedMap);
        windowMapRef.highlightIso3ToColorMap(normalizedMap);
        return;
      }
      
      // Fallback: try document.__wl_map_comp directly
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

  function Section({ id, title, items }: { id: GroupKey; title: string; items: OrgMeta[]; }) {
    const isOpen = expanded[id];
    return (
      <div style={{ marginBottom: 0 }}>
        <button
          onClick={() => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '12px 14px',
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(71, 85, 105, 0.55)',
            borderRadius: 10,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 0,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)';
            e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.85)';
            e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.55)';
          }}
          aria-expanded={isOpen}
          aria-controls={`iop-section-${id}`}
        >
          <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{title}</span>
          <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', fontSize: 12, color: '#94a3b8' }}>▼</span>
        </button>
        {isOpen && (
          <div id={`iop-section-${id}`} role="region" style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.6)', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderTop: '1px solid rgba(71, 85, 105, 0.35)' }}>
            {items.length === 0 && (
              <div style={{ opacity: 0.7, fontSize: 13, color: '#94a3b8' }}>No organizations</div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {items.map((o) => {
                const isChecked = selectedKeys.has(o.key);
                const isLoading = loadingKeys.has(o.key);
                return (
                  <label key={o.key} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={async (e) => { await applySelectionChange(o.key, e.target.checked); }}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#3b82f6' }}
                    />
                    <span style={{ flex: 1, color: '#e2e8f0', fontSize: 14 }}>{o.name}</span>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: o.color, border: '1px solid rgba(71, 85, 105, 0.55)' }} />
                    {isLoading && <span style={{ fontSize: 12, opacity: 0.7, color: '#94a3b8' }}>Loading…</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search organizations…"
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

      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Browse and select from global organizations</div>

      <div 
        className="iop-scrollable" 
        style={{ display: 'grid', gap: 8, maxHeight: 380, overflowY: 'auto', marginBottom: 12 }}
      >
        <style>{`
          .iop-scrollable::-webkit-scrollbar {
            width: 6px;
          }
          .iop-scrollable::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.3);
            border-radius: 3px;
          }
          .iop-scrollable::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.4);
            border-radius: 3px;
          }
          .iop-scrollable::-webkit-scrollbar-thumb:hover {
            background: rgba(59, 130, 246, 0.6);
          }
          .iop-scrollable {
            scrollbar-width: thin;
            scrollbar-color: rgba(59, 130, 246, 0.4) rgba(15, 23, 42, 0.3);
          }
        `}</style>
        <Section id="united_nations" title="United Nations" items={groups.un} />
        <Section id="regional_orgs" title="Regional Organizations" items={groups.regional} />
        <Section id="trade_orgs" title="Trade Organizations" items={groups.trade} />
        <Section id="security_orgs" title="Security Organizations" items={groups.security} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
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
          style={{
            padding: '8px 14px',
            justifyContent: 'center'
          }}
        >Clear</button>
      </div>
    </div>
  );
}


