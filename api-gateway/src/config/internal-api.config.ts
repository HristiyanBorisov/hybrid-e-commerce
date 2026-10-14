import { registerAs } from '@nestjs/config';

/**
 * Service-to-service calls with the admin service, injected with `@Inject(internalApiConfig.KEY)`.
 * Both directions use the same shared API key, sent in the X-Api-Key header.
 */
export const internalApiConfig = registerAs('internalApi', () => ({
  apiKey: process.env.INTERNAL_API_KEY ?? '',
  // The admin service's internal API, reachable only inside the Docker network
  adminServiceUrl: process.env.ADMIN_SERVICE_INTERNAL_URL,
  // How long to wait for the admin service before answering 503
  timeoutMs: 5000,
}));
