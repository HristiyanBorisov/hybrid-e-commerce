import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdminSync } from '../admin-sync/admin-sync.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { OrderItem } from './order-item.entity.js';
import { OrderUpdatesGateway } from './order-updates.gateway.js';
import { Order } from './order.entity.js';
import { OrderStatus } from './order-status.enum.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  const alice = Object.assign(new User(), {
    id: 'alice-id',
    role: UserRole.Customer,
  });
  const bob = Object.assign(new User(), {
    id: 'bob-id',
    role: UserRole.Customer,
  });
  const admin = Object.assign(new User(), {
    id: 'admin-id',
    role: UserRole.Admin,
  });

  const orders = { findAndCount: vi.fn(), findOne: vi.fn() };
  const manager = { findOne: vi.fn(), update: vi.fn(), findBy: vi.fn() };
  const dataSource = {
    transaction: vi.fn(
      (work: (transaction: typeof manager) => Promise<unknown>) =>
        work(manager),
    ),
  };
  const inventory = { returnForOrder: vi.fn(), stockChanged: vi.fn() };
  const adminSync = { orders: vi.fn() };
  const orderUpdates = { publish: vi.fn() };

  const service = new OrdersService(
    orders as unknown as Repository<Order>,
    dataSource as unknown as DataSource,
    inventory as unknown as InventoryService,
    adminSync as unknown as AdminSync,
    orderUpdates as unknown as OrderUpdatesGateway,
  );

  function order(status: OrderStatus, userId = 'alice-id'): Order {
    return Object.assign(new Order(), { id: 'order-1', status, userId });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listForCustomer', () => {
    it("returns one page of the customer's orders, newest first, optionally by status", async () => {
      const query = Object.assign(new ListOrdersQueryDto(), {
        page: 2,
        limit: 10,
      });

      await service.listForCustomer('alice-id', query);
      await service.listForCustomer(
        'alice-id',
        Object.assign(query, { status: OrderStatus.Paid }),
      );

      expect(orders.findAndCount).toHaveBeenNthCalledWith(1, {
        where: { userId: 'alice-id' },
        relations: { items: true },
        order: { createdAt: 'DESC', id: 'DESC', items: { id: 'ASC' } },
        skip: 10,
        take: 10,
      });
      expect(orders.findAndCount.mock.calls[1][0].where).toEqual({
        userId: 'alice-id',
        status: OrderStatus.Paid,
      });
    });
  });

  describe('findVisibleTo', () => {
    it('shows an order to its customer and to admins', async () => {
      orders.findOne.mockResolvedValue(order(OrderStatus.Paid));

      await expect(
        service.findVisibleTo(alice, 'order-1'),
      ).resolves.toMatchObject({ id: 'order-1' });
      await expect(
        service.findVisibleTo(admin, 'order-1'),
      ).resolves.toMatchObject({ id: 'order-1' });
    });

    it("answers 404 for someone else's order and for a missing one", async () => {
      orders.findOne
        .mockResolvedValueOnce(order(OrderStatus.Paid))
        .mockResolvedValueOnce(null);

      await expect(service.findVisibleTo(bob, 'order-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findVisibleTo(alice, 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeStatus', () => {
    it('locks the order, saves the new status (and payment reference) and sends it to the admin service', async () => {
      manager.findOne.mockResolvedValue(order(OrderStatus.Pending));
      orders.findOne.mockResolvedValue(order(OrderStatus.Paid));

      const result = await service.changeStatus(
        'order-1',
        OrderStatus.Paid,
        'mock_ref',
      );

      expect(manager.findOne).toHaveBeenCalledWith(Order, {
        where: { id: 'order-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'order-1' },
        { status: OrderStatus.Paid, paymentReference: 'mock_ref' },
      );
      expect(inventory.returnForOrder).not.toHaveBeenCalled();
      expect(adminSync.orders).toHaveBeenCalledWith(['order-1']);
      expect(orderUpdates.publish).toHaveBeenCalledWith(result);
      expect(result.status).toBe(OrderStatus.Paid);
    });

    it('puts the items back into stock when the order is cancelled', async () => {
      const items = [
        Object.assign(new OrderItem(), { productId: 'lamp-id', quantity: 2 }),
      ];
      manager.findOne.mockResolvedValue(order(OrderStatus.Paid));
      manager.findBy.mockResolvedValue(items);
      orders.findOne.mockResolvedValue(order(OrderStatus.Cancelled));

      await service.changeStatus('order-1', OrderStatus.Cancelled);

      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'order-1' },
        { status: OrderStatus.Cancelled },
      );
      expect(inventory.returnForOrder).toHaveBeenCalledWith(
        manager,
        'order-1',
        items,
      );
      expect(inventory.stockChanged).toHaveBeenCalledWith(['lamp-id']);
    });

    it("refuses a move that isn't allowed with 409, changing nothing", async () => {
      manager.findOne.mockResolvedValue(order(OrderStatus.Delivered));

      await expect(
        service.changeStatus('order-1', OrderStatus.Cancelled),
      ).rejects.toThrow(
        new ConflictException(
          "A delivered order can't be changed to cancelled",
        ),
      );
      expect(manager.update).not.toHaveBeenCalled();
      expect(adminSync.orders).not.toHaveBeenCalled();
      expect(orderUpdates.publish).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown order', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.changeStatus('nope', OrderStatus.Shipped),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
