import { http } from '../../lib/http';
import type { ConflictsResponse } from './types';

export const conflictApi = {
  getEvents: () => http.get<ConflictsResponse>('/api/conflicts/events'),
};
