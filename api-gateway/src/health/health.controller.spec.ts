import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports the app as up', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
