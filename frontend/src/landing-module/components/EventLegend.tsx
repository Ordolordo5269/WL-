import React from 'react';

interface EventLegendProps {
  activeCategory: string | null;
  onCategoryHover: (category: string | null) => void;
}

const EventLegend: React.FC<EventLegendProps> = ({ activeCategory, onCategoryHover }) => {
  const categories = [
    {
      id: 'conflicts',
      label: 'Conflicts',
      color: '#ff4444',
      emoji: '🔴',
      description: 'Global conflicts and tensions'
    },
    {
      id: 'political',
      label: 'Political Changes',
      color: '#4488ff',
      emoji: '🔵',
      description: 'Political reforms and elections'
    },
    {
      id: 'innovation',
      label: 'Innovation & Social',
      color: '#44ff44',
      emoji: '🟢',
      description: 'Technological and social progress'
    }
  ];

  return (
    <div className="absolute bottom-8 left-8 bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/10">
      <h3 className="text-white/90 text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
        Global Events
      </h3>
      
      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 cursor-pointer group ${
              activeCategory === category.id
                ? 'bg-white/10 scale-105'
                : 'hover:bg-white/5'
            }`}
            onMouseEnter={() => onCategoryHover(category.id)}
            onMouseLeave={() => onCategoryHover(null)}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{category.emoji}</span>
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  activeCategory === category.id ? 'animate-pulse scale-125' : ''
                }`}
                style={{ backgroundColor: category.color }}
              ></div>
            </div>
            
            <div className="flex-1">
              <div className="text-white/90 font-medium text-sm">
                {category.label}
              </div>
              <div className="text-white/60 text-xs mt-1">
                {category.description}
              </div>
            </div>
            
            <div className={`w-1 h-8 rounded-full transition-all duration-300 ${
              activeCategory === category.id ? 'opacity-100' : 'opacity-30'
            }`} style={{ backgroundColor: category.color }}></div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-white/50 text-xs flex items-center gap-2">
          <div className="w-1 h-1 bg-white/50 rounded-full animate-pulse"></div>
          Live monitoring • Real-time updates
        </div>
      </div>
    </div>
  );
};

export default EventLegend;