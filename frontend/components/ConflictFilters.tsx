import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';

export interface AdvancedFilters {
  activeOnly?: boolean;
  conflictType?: string[];
  sortBy?: 'startDate' | 'name' | 'casualties' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface ConflictFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  availableConflictTypes: string[];
  onClear: () => void;
}

export default function ConflictFilters({
  filters,
  onFiltersChange,
  availableConflictTypes,
  onClear
}: ConflictFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  const updateFilter = (key: keyof AdvancedFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClear = () => {
    const emptyFilters: AdvancedFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    onClear();
  };

  const toggleConflictType = (type: string) => {
    const currentTypes = localFilters.conflictType || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    updateFilter('conflictType', newTypes.length > 0 ? newTypes : undefined);
  };

  const hasActiveFilters = 
    localFilters.activeOnly ||
    (localFilters.conflictType && localFilters.conflictType.length > 0) ||
    localFilters.sortBy !== 'startDate' ||
    localFilters.sortOrder !== 'desc';

  return (
    <div className="conflict-filters-container">
      <button
        className="conflict-filters-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Filter size={16} strokeWidth={1.5} />
        <span>Advanced Filters</span>
        {hasActiveFilters && <span className="filter-badge">{Object.keys(localFilters).filter(k => localFilters[k as keyof AdvancedFilters]).length}</span>}
        {isExpanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
      </button>

      {isExpanded && (
        <div className="conflict-filters-panel">
          {/* Active Only Filter */}
          <div className="filter-section">
            <div className="filter-checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={localFilters.activeOnly || false}
                  onChange={(e) => updateFilter('activeOnly', e.target.checked || undefined)}
                />
                Active conflicts only
              </label>
            </div>
          </div>

          {/* Conflict Type Filter */}
          {availableConflictTypes.length > 0 && (
            <div className="filter-section">
              <h4 className="filter-section-title">Conflict Type</h4>
              <div className="filter-checkbox-list">
                {availableConflictTypes.map(type => (
                  <label key={type} className="filter-checkbox-item">
                    <input
                      type="checkbox"
                      checked={localFilters.conflictType?.includes(type) || false}
                      onChange={() => toggleConflictType(type)}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Sorting */}
          <div className="filter-section">
            <h4 className="filter-section-title">Sort By</h4>
            <div className="filter-row">
              <div className="filter-group">
                <select
                  value={`${localFilters.sortBy || 'startDate'}-${localFilters.sortOrder || 'desc'}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    updateFilter('sortBy', sortBy as any);
                    updateFilter('sortOrder', sortOrder as 'asc' | 'desc');
                  }}
                  className="filter-select"
                >
                  <option value="startDate-desc">Start Date (Newest)</option>
                  <option value="startDate-asc">Start Date (Oldest)</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="casualties-desc">Casualties (Highest)</option>
                  <option value="casualties-asc">Casualties (Lowest)</option>
                  <option value="status-asc">Status (A-Z)</option>
                  <option value="status-desc">Status (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <div className="filter-actions">
              <button onClick={handleClear} className="filter-clear-btn">
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

