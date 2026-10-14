import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AdminSync } from '../src/admin-sync/admin-sync.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { OrderEmails } from '../src/orders/order-emails.js';

/**
 * Starts the real application (same modules, same global setup as main.ts) for an e2e test.
 * Extra controllers can be added to test global behaviour such as validation.
 *
 * Only the queues are replaced by stubs: a test checks what was queued (`app.get(AdminSync).orders` …)
 * instead of leaving real jobs running in the background. The jobs themselves have unit tests.
 */
export async function createTestApp(
  extraControllers: Type[] = [],
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: extraControllers,
  })
    .overrideProvider(AdminSync)
    .useValue({ orders: vi.fn(), stockLevels: vi.fn() })
    .overrideProvider(OrderEmails)
    .useValue({ sendConfirmation: vi.fn() })
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({
    logger: false,
  });
  configureApp(app);
  await app.init();

  return app;
}
