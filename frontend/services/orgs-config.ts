export type OrgCategory = 'Defense' | 'Regional Union' | 'Economic' | 'Security' | 'Political' | 'Other';

export interface OrgMeta {
  key: string;           // canonical slug (e.g., 'nato', 'eu')
  name: string;          // display name
  color: string;         // representative hex color
  category: OrgCategory;
  aliases: string[];     // search terms / localized names
}

export const ORGANIZATIONS: OrgMeta[] = [
  // United Nations system
  {
    key: 'un',
    name: 'United Nations (UN)',
    color: '#0B5CAB',
    category: 'Political',
    aliases: ['un', 'united nations', 'naciones unidas', 'onu']
  },
  {
    key: 'who',
    name: 'World Health Organization (WHO)',
    color: '#0093D5',
    category: 'Political',
    aliases: ['who', 'world health organization', 'oms', 'organizacion mundial de la salud', 'organización mundial de la salud']
  },
  {
    key: 'unesco',
    name: 'United Nations Educational, Scientific and Cultural Organization (UNESCO)',
    color: '#1A73E8',
    category: 'Political',
    aliases: ['unesco']
  },
  {
    key: 'unicef',
    name: "United Nations Children's Fund (UNICEF)",
    color: '#00AEEF',
    category: 'Political',
    aliases: ['unicef']
  },
  {
    key: 'wfp',
    name: 'World Food Programme (WFP)',
    color: '#1F7EB9',
    category: 'Political',
    aliases: ['wfp', 'world food programme', 'pma', 'programa mundial de alimentos']
  },
  // Regional organizations
  {
    key: 'nato',
    name: 'NATO / OTAN',
    color: '#0033A0', // NATO blue
    category: 'Defense',
    aliases: ['nato', 'otan', 'north atlantic treaty organization', 'organizacion del tratado del atlantico norte', 'organización del tratado del atlántico norte']
  },
  {
    key: 'eu',
    name: 'EU / UE',
    color: '#003399', // EU flag blue
    category: 'Regional Union',
    aliases: ['eu', 'ue', 'european union', 'union europea', 'unión europea']
  },
  {
    key: 'asean',
    name: 'Association of Southeast Asian Nations (ASEAN)',
    color: '#EA3E23',
    category: 'Regional Union',
    aliases: ['asean']
  },
  {
    key: 'au',
    name: 'African Union (AU)',
    color: '#007A3D',
    category: 'Regional Union',
    aliases: ['au', 'african union', 'unión africana', 'union africana']
  },
  {
    key: 'oas',
    name: 'Organization of American States (OAS)',
    color: '#2A6EBB',
    category: 'Regional Union',
    aliases: ['oas', 'oea', 'organization of american states', 'organizacion de los estados americanos', 'organización de los estados americanos']
  },
  {
    key: 'ecowas',
    name: 'Economic Community of West African States (ECOWAS)',
    color: '#8CC63E',
    category: 'Regional Union',
    aliases: ['ecowas', 'ceao', 'cedeao']
  },
  {
    key: 'sadc',
    name: 'Southern African Development Community (SADC)',
    color: '#1E90FF',
    category: 'Regional Union',
    aliases: ['sadc']
  },
  {
    key: 'mercosur',
    name: 'MERCOSUR',
    color: '#00A0E0',
    category: 'Regional Union',
    aliases: ['mercosur', 'mercosul']
  },
  // Trade / economic
  {
    key: 'wto',
    name: 'World Trade Organization (WTO)',
    color: '#CC0000',
    category: 'Economic',
    aliases: ['wto', 'world trade organization', 'omc', 'organizacion mundial del comercio', 'organización mundial del comercio']
  },
  {
    key: 'efta',
    name: 'European Free Trade Association (EFTA)',
    color: '#2E7D32',
    category: 'Economic',
    aliases: ['efta']
  },
  {
    key: 'usmca',
    name: 'United States–Mexico–Canada Agreement (USMCA)',
    color: '#1A73E8',
    category: 'Economic',
    aliases: ['usmca', 'cuscma', 'tmec', 'nafta']
  },
  // Security
  {
    key: 'sco',
    name: 'Shanghai Cooperation Organisation (SCO)',
    color: '#17806D',
    category: 'Security',
    aliases: ['sco', 'shanghai cooperation organisation']
  },
  {
    key: 'csto',
    name: 'Collective Security Treaty Organization (CSTO)',
    color: '#0E76BD',
    category: 'Security',
    aliases: ['csto']
  }
];

export function findOrgByQuery(query: string | null | undefined): OrgMeta | null {
  const s = (query || '').toLowerCase().trim();
  if (!s) return null;
  for (const org of ORGANIZATIONS) {
    if (org.key === s) return org;
    if (org.aliases.some(a => a.toLowerCase() === s)) return org;
    if (org.aliases.some(a => s.includes(a.toLowerCase()))) return org;
  }
  return null;
}







