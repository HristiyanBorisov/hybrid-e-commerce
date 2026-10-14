import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Product } from '../catalog/product.entity.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PaymentGateway } from '../payments/payment-gateway.js';
import { User } from '../users/user.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { CreateOrderItemDto } from './dto/create-order-item.dto.js';
import { OrderEmails } from './order-emails.js';
import { OrderItem } from './order-item.entity.js';
import { OrderStatus } from './order-status.enum.js';
import { Order } from './order.entity.js';
import { OrdersService } from './orders.service.js';

/** The largest total an order can have: total_cents is a 4-byte integer */
const MAX_TOTAL_CENTS = 2_147_483_647;

/**
 * Turns a customer's request into a paid order:
 * 1. every product must exist (422);
 * 2. the order is saved and its items are taken out of stock in one transaction (409 if one is short —
 *    then nothing is saved);
 * 3. the payment is charged: if it fails, the order is cancelled and its stock goes back (402);
 * 4. the order becomes paid and a confirmation email is queued.
 */
@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentGateway,
    private readonly ordersService: OrdersService,
    private readonly orderEmails: OrderEmails,
  ) {}

  async placeOrder(customer: User, data: CreateOrderDto): Promise<Order> {
    const products = await this.findProducts(data.items);
    const order = this.newOrder(customer, data.items, products);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(order);
      await this.inventory.takeForOrder(manager, order.id, order.items);
    });
    await this.inventory.stockChanged(products.map((product) => product.id));

    const paymentReference = await this.charge(order, data.paymentToken);
    const paidOrder = await this.ordersService.changeStatus(
      order.id,
      OrderStatus.Paid,
      paymentReference,
    );
    await this.orderEmails.sendConfirmation(order.id);

    return paidOrder;
  }

  /** The ordered products, in the same order as the items. 422 for any that doesn't exist or was deleted. */
  private async findProducts(items: CreateOrderItemDto[]): Promise<Product[]> {
    const found = await this.products.findBy({
      id: In(items.map((item) => item.productId)),
    });
    const byId = new Map(found.map((product) => [product.id, product]));

    const errors: Record<string, string[]> = {};
    items.forEach((item, index) => {
      if (!byId.has(item.productId)) {
        errors[`items.${index}.productId`] = ['Product not found'];
      }
    });

    if (Object.keys(errors).length > 0) {
      throw new UnprocessableEntityException({
        message: 'Validation failed',
        errors,
      });
    }

    return items.map((item) => byId.get(item.productId) as Product);
  }

  /** A pending order with each product's current name and price. */
  private newOrder(
    customer: User,
    items: CreateOrderItemDto[],
    products: Product[],
  ): Order {
    const { manager } = this.dataSource;
    const order = manager.create(Order, {
      userId: customer.id,
      status: OrderStatus.Pending,
    });

    order.items = items.map((item, index) =>
      manager.create(OrderItem, {
        orderId: order.id,
        productId: products[index].id,
        productName: products[index].name,
        unitPriceCents: products[index].priceCents,
        quantity: item.quantity,
      }),
    );
    order.totalCents = order.items.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity,
      0,
    );

    if (order.totalCents > MAX_TOTAL_CENTS) {
      throw new UnprocessableEntityException({
        message: 'Validation failed',
        errors: { items: ['The order total is too large'] },
      });
    }

    return order;
  }

  /** Charges the order. If that fails, the order is cancelled (its stock goes back) and the error is passed on. */
  private async charge(order: Order, paymentToken: string): Promise<string> {
    try {
      return await this.payments.charge(
        order.id,
        order.totalCents,
        paymentToken,
      );
    } catch (error) {
      await this.ordersService.changeStatus(order.id, OrderStatus.Cancelled);
      throw error;
    }
  }
}
