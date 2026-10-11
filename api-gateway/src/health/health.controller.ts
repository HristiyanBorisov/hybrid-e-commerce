import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /** Liveness check used by Docker and nginx: the app is up and serving requests. */
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
