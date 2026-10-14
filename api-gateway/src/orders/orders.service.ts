import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminSync } from '../admin-sync/admin-sync.js';
import { pageOptions } from '../common/pagination.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { OrderItem } from './order-item.entity.js';
import { OrderUpdatesGateway } from './order-updates.gateway.js';
import { OrderStatus } from './order-status.enum.js';
import { Order } from './order.entity.js';

/** Reading orders and moving them from one status to the next. Placing an order is CheckoutService. */
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly inventory: InventoryService,
    private readonly adminSync: AdminSync,
    private readonly orderUpdates: OrderUpdatesGateway,
  ) {}

  /** One page of a customer's orders, newest first. */
  listForCustomer(
    customerId: string,
    query: ListOrdersQueryDto,
  ): Promise<[Order[], number]> {
    return this.orders.findAndCount({
      where: {
        userId: customerId,
        ...(query.status && { status: query.status }),
      },
      relations: { items: true },
      order: { createdAt: 'DESC', id: 'DESC', items: { id: 'ASC' } },
      ...pageOptions(query),
    });
  }

  /** Throws 404 when the order doesn't exist. */
  async findById(id: string): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id },
      relations: { items: true },
      order: { items: { id: 'ASC' } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /** Customers see only their own orders, admins every order. Someone else's order is a 404, as if it didn't exist. */
  async findVisibleTo(user: User, id: string): Promise<Order> {
    const order = await this.findById(id);

    if (order.userId !== user.id && user.role !== UserRole.Admin) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Moves an order on: pending → paid → shipped → delivered, or cancelled while pending or paid
   * (cancelling puts the items back into stock). 409 for a move that isn't allowed. The admin service gets the
   * change through its sync, and the customer sees it live (OrderUpdatesGateway).
   *
   * The order's row is locked until the change is saved, so two changes to one order can't run at once
   * (e.g. two admins cancelling it, which would put its stock back twice).
   */
  async changeStatus(
    id: string,
    status: OrderStatus,
    paymentReference?: string,
  ): Promise<Order> {
    const returnedItems = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (!order.canMoveTo(status)) {
        throw new ConflictException(
          `A ${order.status} order can't be changed to ${status}`,
        );
      }

      await manager.update(
        Order,
        { id },
        { status, ...(paymentReference && { paymentReference }) },
      );

      if (status !== OrderStatus.Cancelled) {
        return [];
      }

      const items = await manager.findBy(OrderItem, { orderId: id });
      await this.inventory.returnForOrder(manager, id, items);
      return items;
    });

    if (returnedItems.length > 0) {
      await this.inventory.stockChanged(
        returnedItems.map((item) => item.productId),
      );
    }
    await this.adminSync.orders([id]);

    const order = await this.findById(id);
    this.orderUpdates.publish(order);

    return order;
  }
}
