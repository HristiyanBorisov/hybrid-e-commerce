import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DataSource,
  EntityTarget,
  In,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { Product } from '../catalog/product.entity.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PaymentDeclinedException } from '../payments/payment-declined.exception.js';
import { PaymentGateway } from '../payments/payment-gateway.js';
import { User } from '../users/user.entity.js';
import { CheckoutService } from './checkout.service.js';
import { OrderEmails } from './order-emails.js';
import { Order } from './order.entity.js';
import { OrderStatus } from './order-status.enum.js';
import { OrdersService } from './orders.service.js';

function product(id: string, name: string, priceCents: number): Product {
  return Object.assign(new Product(), { id, name, priceCents });
}

describe('CheckoutService', () => {
  const lamp = product('lamp-id', 'Desk Lamp', 2990);
  const rug = product('rug-id', 'Rug', 9900);
  const customer = Object.assign(new User(), { id: 'alice-id' });
  const paidOrder = Object.assign(new Order(), { status: OrderStatus.Paid });

  const manager = {
    create: <T extends ObjectLiteral>(
      entity: EntityTarget<T>,
      data: object,
    ): T => Object.assign(new (entity as new () => T)(), data),
    save: vi.fn(),
  };
  const dataSource = {
    manager,
    transaction: vi.fn(
      (work: (transaction: typeof manager) => Promise<unknown>) =>
        work(manager),
    ),
  };
  const products = { findBy: vi.fn() };
  const inventory = { takeForOrder: vi.fn(), stockChanged: vi.fn() };
  const payments = { charge: vi.fn() };
  const ordersService = { changeStatus: vi.fn() };
  const orderEmails = { sendConfirmation: vi.fn() };

  const checkout = new CheckoutService(
    products as unknown as Repository<Product>,
    dataSource as unknown as DataSource,
    inventory as unknown as InventoryService,
    payments as unknown as PaymentGateway,
    ordersService as unknown as OrdersService,
    orderEmails as unknown as OrderEmails,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    products.findBy.mockResolvedValue([rug, lamp]);
    payments.charge.mockResolvedValue('mock_ref');
    ordersService.changeStatus.mockResolvedValue(paidOrder);
  });

  const request = {
    items: [
      { productId: 'lamp-id', quantity: 2 },
      { productId: 'rug-id', quantity: 1 },
    ],
    paymentToken: 'tok_visa',
  };

  function savedOrder(): Order {
    return manager.save.mock.calls[0][0] as Order;
  }

  it('saves the order with the catalog names and prices and takes its stock in the same transaction', async () => {
    await checkout.placeOrder(customer, request);

    const order = savedOrder();
    expect(products.findBy).toHaveBeenCalledWith({
      id: In(['lamp-id', 'rug-id']),
    });
    expect(order).toMatchObject({
      userId: 'alice-id',
      status: OrderStatus.Pending,
      totalCents: 2 * 2990 + 9900,
      items: [
        {
          orderId: order.id,
          productId: 'lamp-id',
          productName: 'Desk Lamp',
          unitPriceCents: 2990,
          quantity: 2,
        },
        {
          orderId: order.id,
          productId: 'rug-id',
          productName: 'Rug',
          unitPriceCents: 9900,
          quantity: 1,
        },
      ],
    });
    expect(inventory.takeForOrder).toHaveBeenCalledWith(
      manager,
      order.id,
      order.items,
    );
    expect(inventory.stockChanged).toHaveBeenCalledWith(['lamp-id', 'rug-id']);
  });

  it('charges the total, marks the order paid and queues the confirmation email', async () => {
    const result = await checkout.placeOrder(customer, request);

    const order = savedOrder();
    expect(payments.charge).toHaveBeenCalledWith(order.id, 15880, 'tok_visa');
    expect(ordersService.changeStatus).toHaveBeenCalledWith(
      order.id,
      OrderStatus.Paid,
      'mock_ref',
    );
    expect(orderEmails.sendConfirmation).toHaveBeenCalledWith(order.id);
    expect(result).toBe(paidOrder);
  });

  it('answers 422 for products that are missing, and saves nothing', async () => {
    products.findBy.mockResolvedValue([lamp]);

    const error = await checkout
      .placeOrder(customer, request)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toEqual({
      message: 'Validation failed',
      errors: { 'items.1.productId': ['Product not found'] },
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it("answers 422 when the total doesn't fit the database column", async () => {
    products.findBy.mockResolvedValue([
      product('lamp-id', 'Gold Lamp', 999_999_900),
    ]);

    await expect(
      checkout.placeOrder(customer, {
        items: [{ productId: 'lamp-id', quantity: 3 }],
        paymentToken: 'tok_visa',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it("charges nothing when the stock isn't there", async () => {
    inventory.takeForOrder.mockRejectedValueOnce(
      new ConflictException('Not enough stock'),
    );

    await expect(checkout.placeOrder(customer, request)).rejects.toThrow(
      ConflictException,
    );
    expect(payments.charge).not.toHaveBeenCalled();
    expect(inventory.stockChanged).not.toHaveBeenCalled();
  });

  it('cancels the order when the payment fails, and passes the error on', async () => {
    payments.charge.mockRejectedValueOnce(new PaymentDeclinedException());

    await expect(checkout.placeOrder(customer, request)).rejects.toThrow(
      PaymentDeclinedException,
    );
    expect(ordersService.changeStatus).toHaveBeenCalledWith(
      savedOrder().id,
      OrderStatus.Cancelled,
    );
    expect(orderEmails.sendConfirmation).not.toHaveBeenCalled();
  });
});
