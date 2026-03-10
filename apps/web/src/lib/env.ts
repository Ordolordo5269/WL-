export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN as string,
} as const;
