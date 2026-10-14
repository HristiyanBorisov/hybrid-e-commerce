import { Queue } from 'bullmq';
import { AdminSync } from './admin-sync.js';
import { AdminSyncJob } from './admin-sync-job.enum.js';

describe('AdminSync', () => {
  const queue = { addBulk: vi.fn() };
  const adminSync = new AdminSync(queue as unknown as Queue);

  it('queues one job per order, carrying only the id', async () => {
    await adminSync.orders(['order-1', 'order-2']);

    expect(queue.addBulk).toHaveBeenCalledWith([
      { name: AdminSyncJob.Order, data: { id: 'order-1' } },
      { name: AdminSyncJob.Order, data: { id: 'order-2' } },
    ]);
  });

  it('queues one job per stock level', async () => {
    await adminSync.stockLevels(['product-1']);

    expect(queue.addBulk).toHaveBeenCalledWith([
      { name: AdminSyncJob.StockLevel, data: { id: 'product-1' } },
    ]);
  });
});
