import { useState } from 'react';
import { ChevronDown, Globe, Banknote, Landmark, Shield, Users, Globe2, Cpu, Palette } from 'lucide-react';

interface CategoryGroupProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
}

function CategoryGroup({ icon, title, items }: CategoryGroupProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800">
      <button
        className="flex w-full items-center gap-2 p-2 hover:bg-slate-800"
        onClick={() => setOpen(!open)}
      >
        {icon}
        <span>{title}</span>
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="pl-6 pb-2 text-sm text-slate-300">
          {items.map((item) => (
            <li key={item} className="py-0.5 hover:text-slate-100">
              <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CountrySidebar() {
  return (
    <div className="fixed right-0 top-0 z-20 h-full w-64 bg-slate-900/95 text-slate-200 overflow-y-auto shadow-lg">
      <div className="p-4 border-b border-slate-800">
        <input
          placeholder="Search country data..."
          className="w-full rounded bg-slate-900 border border-slate-700 p-2 text-slate-200 placeholder-slate-400"
        />
      </div>
      <div className="p-2 space-y-2">
        <CategoryGroup
          icon={<Globe className="text-blue-400" />}
          title="General Information"
          items={[
            'Official Name',
            'Flag',
            'Surface Area',
            'Languages',
            'Currency',
            'ISO Code',
            'Continent',
            'Capital City',
            'Population',
            'Government Type',
          ]}
        />
        <CategoryGroup
          icon={<Banknote className="text-green-400" />}
          title="Economy"
          items={[
            'GDP (Gross Domestic Product)',
            'GDP per Capita',
            'Inflation Rate',
            'GINI Index',
            'GDP Sector Breakdown',
            'Exports & Imports',
            'Main Trade Partners',
            'External Debt',
            'Unemployment Rate',
          ]}
        />
        <CategoryGroup
          icon={<Landmark className="text-purple-400" />}
          title="Politics"
          items={['Political Parties', 'Political System', 'Head of State / Government', 'Political Stability']}
        />
        <CategoryGroup
          icon={<Shield className="text-red-400" />}
          title="Defence"
          items={[
            'Military Budget',
            'Armed Forces Size',
            'Active Conflicts',
            'Peace Operations',
            'Main Military Adversaries',
          ]}
        />
        <CategoryGroup
          icon={<Users className="text-yellow-400" />}
          title="Social"
          items={[
            'Life Expectancy',
            'Literacy Rate',
            'Poverty Indicators',
            'Health & Education Access',
            'Human Development Index (HDI)',
            'Demographics',
            'Birth / Death Rates',
            'Urban / Rural Population (%)',
            'Population Density',
          ]}
        />
        <CategoryGroup
          icon={<Globe2 className="text-cyan-400" />}
          title="International"
          items={[
            'International Organizations Membership',
            'Treaties',
            'Regional Cooperation',
            'Official Development Assistance (ODA)',
            'Top Recipients',
            'Rival Countries',
            'Key Allies',
          ]}
        />
        <CategoryGroup
          icon={<Cpu className="text-indigo-400" />}
          title="Technology & National Assets"
          items={[
            'R&D Index',
            'Tech Exports',
            'Top National Companies',
            'State-Owned Enterprises (SOEs)',
            'Strategic Holdings',
            'Sovereign Wealth Funds',
            'Strategic Industries & Specializations',
            'Industrial Policy',
            'Critical Minerals & Share of Global Supply',
          ]}
        />
        <CategoryGroup
          icon={<Palette className="text-pink-400" />}
          title="Culture"
          items={['Religions', 'UNESCO World Heritage Sites', 'Soft Power Metrics']}
        />
      </div>
    </div>
  );
}
