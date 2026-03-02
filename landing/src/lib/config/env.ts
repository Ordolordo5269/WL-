export function readEnv(key: string): string | undefined {
  return import.meta.env[key as keyof ImportMetaEnv] as string | undefined
}
