import { Conflict } from '../data/conflicts-data';

export interface ConflictActionHandlers {
  onCenterMap?: (coordinates: { lat: number; lng: number }) => void;
  onConflictSelect?: (conflictId: string | null) => void;
  onBack: () => void;
}

export class ConflictActionService {
  private handlers: ConflictActionHandlers;
  private selectedConflict: Conflict | null = null;

  constructor(handlers: ConflictActionHandlers) {
    this.handlers = handlers;
  }

  /**
   * Handle conflict click action
   * Centers map and selects the conflict
   */
  handleConflictClick = (conflict: Conflict): void => {
    if (this.handlers.onCenterMap) {
      this.handlers.onCenterMap(conflict.coordinates);
    }
    
    this.selectedConflict = conflict;
    
    if (this.handlers.onConflictSelect) {
      this.handlers.onConflictSelect(conflict.id);
    }
  };

  /**
   * Handle back action
   * Clears selection and navigates back
   */
  handleBack = (): void => {
    if (this.handlers.onConflictSelect) {
      this.handlers.onConflictSelect(null);
    }
    this.selectedConflict = null;
    this.handlers.onBack();
  };

  /**
   * Get currently selected conflict
   */
  getSelectedConflict(): Conflict | null {
    return this.selectedConflict;
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    this.selectedConflict = null;
    if (this.handlers.onConflictSelect) {
      this.handlers.onConflictSelect(null);
    }
  }

  /**
   * Update handlers if needed
   */
  updateHandlers(newHandlers: Partial<ConflictActionHandlers>): void {
    this.handlers = { ...this.handlers, ...newHandlers };
  }
}

/**
 * Factory function to create a ConflictActionService instance
 */
export const createConflictActionService = (handlers: ConflictActionHandlers): ConflictActionService => {
  return new ConflictActionService(handlers);
};

/**
 * Hook-like function for React components to use conflict actions
 */
export const useConflictActions = (handlers: ConflictActionHandlers) => {
  const actionService = new ConflictActionService(handlers);
  
  return {
    handleConflictClick: actionService.handleConflictClick,
    handleBack: actionService.handleBack,
    getSelectedConflict: actionService.getSelectedConflict.bind(actionService),
    clearSelection: actionService.clearSelection.bind(actionService)
  };
};