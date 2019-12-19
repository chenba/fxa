import * as RedisTypes from '@types/redis';

declare module 'redis' {
  export = RedisFactory;
}

export default function RedisFactory(
  logger: Logger,
  config: RedisConfig
): FxaRedisClient;

export interface FxaRedisClient extends RedisTypes.RedisClient {
  update(key: string, cb?: Callback<string>): void;
  zpoprangebyscore(
    key: string,
    min: number,
    max: number,
    withScore: boolean
  ): Promise<Array<any>>;
}

export interface RedisConfig {
  host: string;
  port: number;
  sessionTokens: {
    enabled: boolean;
    maxConnections: number;
    minConnections: number;
    prefix: string;
  };
}

export interface Logger {
  error(type: string, fields: object): void;
  info(type: string, fields: object): void;
  warning(type: string, fields: object): void;
}
