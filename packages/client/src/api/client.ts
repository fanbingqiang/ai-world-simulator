import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const worldApi = {
  create: (data: any) => api.post('/world', data).then(r => r.data),
  get: (id: string) => api.get(`/world/${id}`).then(r => r.data),
  update: (id: string, data: any) => api.put(`/world/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/world/${id}`).then(r => r.data),
  list: () => api.get('/world').then(r => r.data),
  addLocation: (id: string, data: any) => api.post(`/world/${id}/locations`, data).then(r => r.data),
};

export const characterApi = {
  create: (data: any) => api.post('/characters', data).then(r => r.data),
  list: (worldId?: string) => api.get('/characters', { params: { worldId } }).then(r => r.data),
  get: (id: string) => api.get(`/characters/${id}`).then(r => r.data),
  update: (id: string, data: any) => api.put(`/characters/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/characters/${id}`).then(r => r.data),
};

export const simulationApi = {
  tick: (worldId: string) => api.post('/simulation/tick', { worldId }).then(r => r.data),
  start: (worldId: string, interval?: number) => api.post('/simulation/start', { worldId, interval }).then(r => r.data),
  stop: () => api.post('/simulation/stop').then(r => r.data),
  state: () => api.get('/simulation/state').then(r => r.data),
  reset: (worldId: string) => api.post('/simulation/reset', { worldId }).then(r => r.data),
};

export const eventApi = {
  list: (worldId: string, params?: any) => api.get('/events', { params: { worldId, ...params } }).then(r => r.data),
  get: (id: string) => api.get(`/events/${id}`).then(r => r.data),
  createManual: (data: any) => api.post('/events/manual', data).then(r => r.data),
};

export const storyApi = {
  list: (worldId: string) => api.get('/story-arcs', { params: { worldId } }).then(r => r.data),
  create: (data: any) => api.post('/story-arcs', data).then(r => r.data),
  export: (id: string) => api.post(`/story-arcs/${id}/export`).then(r => r.data),
};

export const analyticsApi = {
  conflicts: (worldId: string) => api.get('/analytics/conflicts', { params: { worldId } }).then(r => r.data),
  evolution: (characterId: string) => api.get('/analytics/character-evolution', { params: { characterId } }).then(r => r.data),
  relationships: (worldId: string) => api.get('/analytics/relationships', { params: { worldId } }).then(r => r.data),
};
