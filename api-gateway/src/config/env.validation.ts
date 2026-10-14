import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Every environment variable the app needs.
 * The app refuses to start when one is missing or invalid, instead of failing at the first request that needs it.
 */
export class EnvironmentVariables {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  JWT_PRIVATE_KEY_PATH: string;

  @IsString()
  @IsNotEmpty()
  JWT_PUBLIC_KEY_PATH: string;

  /** Token lifetime in seconds */
  @IsInt()
  @Min(60)
  JWT_TTL: number;

  /** bcrypt cost: 12 in production, 4 in tests (each step doubles the hashing time) */
  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_ROUNDS: number;

  // Kept as text: converting "false" to a boolean would give true
  @IsIn(['true', 'false'])
  AUTH_COOKIE_SECURE: string;

  /** e.g. redis://redis:6379/2 — the number at the end is the Redis database */
  @IsUrl({ protocols: ['redis'], require_tld: false, require_protocol: true })
  CACHE_REDIS_URL: string;

  /** Queued jobs — a different Redis database than the cache */
  @IsUrl({ protocols: ['redis'], require_tld: false, require_protocol: true })
  QUEUE_REDIS_URL: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_tld: false,
    require_protocol: true,
  })
  ELASTICSEARCH_URL: string;

  /** Lowercase letters, digits, "-" and "_" — what Elasticsearch accepts as an index name */
  @Matches(/^[a-z0-9_-]+$/)
  ELASTICSEARCH_INDEX: string;

  @IsString()
  @IsNotEmpty()
  MAIL_HOST: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  MAIL_PORT: number;

  /** Sender of every email, e.g. "Shop <orders@shop.test>" */
  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string;

  /** Base URL of the admin service's internal API */
  @IsUrl({
    protocols: ['http', 'https'],
    require_tld: false,
    require_protocol: true,
  })
  ADMIN_SERVICE_INTERNAL_URL: string;

  /** Shared secret between the two services — long enough not to be guessed */
  @IsString()
  @MinLength(16)
  INTERNAL_API_KEY: string;
}

/** Validates the environment and lists every problem at once. */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const environment = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const problems = validateSync(environment).flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment variables:\n- ${problems.join('\n- ')}`,
    );
  }

  return environment;
}
