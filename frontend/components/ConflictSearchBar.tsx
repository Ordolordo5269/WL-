import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface ConflictSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export default function ConflictSearchBar({ 
  value, 
  onChange, 
  placeholder = "Search conflicts...",
  debounceMs = 300 
}: ConflictSearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className="conflict-search-bar">
      <Search className="conflict-search-icon" size={18} strokeWidth={1.5} />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="conflict-search-input"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="conflict-search-clear"
          aria-label="Clear search"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

