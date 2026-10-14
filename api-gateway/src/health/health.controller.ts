import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';

// Not versioned and no login: used by Docker and nginx, not by API clients → /api/health
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  /** Liveness check used by Docker and nginx: the app is up and serving requests. */
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
