import { Order } from './order.entity.js';
import { OrderStatus } from './order-status.enum.js';

describe('Order', () => {
  function order(status: OrderStatus): Order {
    return Object.assign(new Order(), { status });
  }

  it.each([
    [OrderStatus.Pending, [OrderStatus.Paid, OrderStatus.Cancelled]],
    [OrderStatus.Paid, [OrderStatus.Shipped, OrderStatus.Cancelled]],
    [OrderStatus.Shipped, [OrderStatus.Delivered]],
    [OrderStatus.Delivered, []],
    [OrderStatus.Cancelled, []],
  ])('a %s order can move to %j and nowhere else', (from, allowed) => {
    const reachable = Object.values(OrderStatus).filter((to) =>
      order(from).canMoveTo(to),
    );

    expect(reachable).toEqual(allowed);
  });
});
