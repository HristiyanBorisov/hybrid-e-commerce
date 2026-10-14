import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const validEnvironment = {
    PORT: '3000',
    DB_HOST: 'postgres',
    DB_PORT: '5432',
    DB_DATABASE: 'gateway_db',
    DB_USERNAME: 'api_gateway',
    DB_PASSWORD: 'secret',
    JWT_PRIVATE_KEY_PATH: '/keys/jwt-private.pem',
    JWT_PUBLIC_KEY_PATH: '/keys/jwt-public.pem',
    JWT_TTL: '3600',
    BCRYPT_ROUNDS: '12',
    AUTH_COOKIE_SECURE: 'false',
    CACHE_REDIS_URL: 'redis://redis:6379/2',
    QUEUE_REDIS_URL: 'redis://redis:6379/3',
    ELASTICSEARCH_URL: 'http://elasticsearch:9200',
    ELASTICSEARCH_INDEX: 'products',
    MAIL_HOST: 'mailpit',
    MAIL_PORT: '1025',
    MAIL_FROM: 'Shop <orders@shop.test>',
    ADMIN_SERVICE_INTERNAL_URL: 'http://nginx:8081/internal/v1',
    INTERNAL_API_KEY: 'local-dev-internal-api-key',
  };

  it('accepts a complete environment and converts numbers', () => {
    const environment = validateEnv(validEnvironment);

    expect(environment.PORT).toBe(3000);
    expect(environment.DB_PORT).toBe(5432);
    expect(environment.DB_HOST).toBe('postgres');
    expect(environment.JWT_TTL).toBe(3600);
  });

  it('lists every problem at once', () => {
    const { DB_HOST: _missing, ...withoutHost } = validEnvironment;

    expect(() => validateEnv({ ...withoutHost, PORT: 'not-a-port' })).toThrow(
      /Invalid environment variables:[\s\S]*PORT must be an integer number[\s\S]*DB_HOST should not be empty/,
    );
  });

  it('rejects a port outside the valid range', () => {
    expect(() =>
      validateEnv({ ...validEnvironment, DB_PORT: '70000' }),
    ).toThrow('DB_PORT must not be greater than 65535');
  });

  it('accepts only "true" or "false" for AUTH_COOKIE_SECURE', () => {
    expect(() =>
      validateEnv({ ...validEnvironment, AUTH_COOKIE_SECURE: 'yes' }),
    ).toThrow(
      'AUTH_COOKIE_SECURE must be one of the following values: true, false',
    );
  });

  it('rejects a bcrypt cost that is too weak', () => {
    expect(() =>
      validateEnv({ ...validEnvironment, BCRYPT_ROUNDS: '2' }),
    ).toThrow('BCRYPT_ROUNDS must not be less than 4');
  });

  it('checks the service URLs and the API key', () => {
    expect(() =>
      validateEnv({
        ...validEnvironment,
        CACHE_REDIS_URL: 'http://redis:6379',
        ADMIN_SERVICE_INTERNAL_URL: 'nginx:8081',
        INTERNAL_API_KEY: 'short',
      }),
    ).toThrow(
      /CACHE_REDIS_URL must be a URL address[\s\S]*ADMIN_SERVICE_INTERNAL_URL must be a URL address[\s\S]*INTERNAL_API_KEY must be longer than or equal to 16 characters/,
    );
  });
});
