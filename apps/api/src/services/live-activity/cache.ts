export class MemoryCache<T> {
  private data: T | null = null;
  private expiresAt = 0;

  constructor(private ttlMs: number) {}

  get(): T | null {
    return Date.now() < this.expiresAt ? this.data : null;
  }

  set(value: T): void {
    this.data = value;
    this.expiresAt = Date.now() + this.ttlMs;
  }

  clear(): void {
    this.data = null;
    this.expiresAt = 0;
  }
}
