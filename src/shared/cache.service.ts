import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.client.set(key, serializedValue, 'EX', ttl);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async remember<T>(
    key: string,
    ttl: number,
    cb: () => Promise<T>,
  ): Promise<T> {
    let value = await this.get<T>(key);
    if (value) {
      return value;
    }

    value = await cb();
    await this.set(key, value, ttl);
    return value;
  }

  has(key: string) {
    return this.client.exists(key);
  }

  keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
