import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export interface CacheEntry<T = unknown> {
  key: string;
  namespace: string;
  value: T;
  expiresAt: number; // epoch ms
}

export interface CacheStore {
  get<T = unknown>(namespace: string, key: string): T | null;
  set<T = unknown>(namespace: string, key: string, value: T, ttlSeconds: number): void;
  invalidate(namespace: string, key: string): void;
  invalidateNamespace(namespace: string): void;
}

class SqliteCache implements CacheStore {
  private db: Database.Database;
  private insertStmt: Database.Statement;
  private getStmt: Database.Statement;
  private delStmt: Database.Statement;
  private clearNsStmt: Database.Statement;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS cache(
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL,
      PRIMARY KEY(namespace, key)
    );`);
    this.insertStmt = this.db.prepare('INSERT OR REPLACE INTO cache(namespace, key, value, expiresAt) VALUES(?,?,?,?)');
    this.getStmt = this.db.prepare('SELECT value, expiresAt FROM cache WHERE namespace=? AND key=?');
    this.delStmt = this.db.prepare('DELETE FROM cache WHERE namespace=? AND key=?');
    this.clearNsStmt = this.db.prepare('DELETE FROM cache WHERE namespace=?');
  }

  get<T>(namespace: string, key: string): T | null {
    try {
      const row = this.getStmt.get(namespace, key) as { value: string; expiresAt: number } | undefined;
      if (!row) return null;
      if (row.expiresAt <= Date.now()) {
        this.delStmt.run(namespace, key);
        return null;
      }
      return JSON.parse(row.value) as T;
    } catch (err) {
      logger.warn({ err }, 'Sqlite cache get failed');
      return null;
    }
  }

  set<T>(namespace: string, key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    try {
      this.insertStmt.run(namespace, key, JSON.stringify(value), expiresAt);
    } catch (err) {
      logger.warn({ err }, 'Sqlite cache set failed');
    }
  }

  invalidate(namespace: string, key: string): void {
    try {
      this.delStmt.run(namespace, key);
    } catch (err) {
      logger.warn({ err }, 'Sqlite cache invalidate failed');
    }
  }

  invalidateNamespace(namespace: string): void {
    try {
      this.clearNsStmt.run(namespace);
    } catch (err) {
      logger.warn({ err }, 'Sqlite cache invalidate namespace failed');
    }
  }
}

class MemoryCache implements CacheStore {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(namespace: string, key: string): T | null {
    const ent = this.store.get(`${namespace}::${key}`);
    if (!ent) return null;
    if (ent.expiresAt <= Date.now()) {
      this.store.delete(`${namespace}::${key}`);
      return null;
    }
    return ent.value as T;
  }

  set<T>(namespace: string, key: string, value: T, ttlSeconds: number): void {
    this.store.set(`${namespace}::${key}`, { key, namespace, value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  invalidate(namespace: string, key: string): void {
    this.store.delete(`${namespace}::${key}`);
  }

  invalidateNamespace(namespace: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(`${namespace}::`)) this.store.delete(k);
    }
  }
}

export function createCache(): CacheStore {
  try {
    // place DB in runtime folder
    const dbPath = process.env.CACHE_DB_PATH || './.cache/worldlore-cache.db';
    return new SqliteCache(dbPath);
  } catch (err) {
    logger.warn({ err }, 'Falling back to in-memory cache');
    return new MemoryCache();
  }
}

export const cache = createCache();

