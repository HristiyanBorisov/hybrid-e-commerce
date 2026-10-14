import { User } from '../users/user.entity.js';
import { orderConfirmationEmail } from './order-confirmation.email.js';
import { OrderItem } from './order-item.entity.js';
import { Order } from './order.entity.js';

describe('orderConfirmationEmail', () => {
  const order = Object.assign(new Order(), {
    totalCents: 165799,
    user: Object.assign(new User(), {
      name: 'Alice <Admin>',
      email: 'alice@example.com',
    }),
    items: [
      Object.assign(new OrderItem(), {
        productName: 'Pixel Pro 9',
        unitPriceCents: 79900,
        quantity: 2,
      }),
      Object.assign(new OrderItem(), {
        productName: 'Knife & Fork',
        unitPriceCents: 5999,
        quantity: 1,
      }),
    ],
  });

  it('goes to the customer with the items and the total', () => {
    const email = orderConfirmationEmail(order);

    expect(email.to).toBe('alice@example.com');
    expect(email.subject).toBe('Your order is confirmed (1,657.99)');
    expect(email.text).toContain('2 × Pixel Pro 9: 1,598.00');
    expect(email.text).toContain('1 × Knife & Fork: 59.99');
    expect(email.text).toContain('Total: 1,657.99');
    expect(email.text).toContain(`Order number: ${order.id}`);
  });

  it('escapes names in the HTML version', () => {
    const { html } = orderConfirmationEmail(order);

    expect(html).toContain('Hi Alice &#60;Admin&#62;,');
    expect(html).toContain('Knife &#38; Fork');
    expect(html).not.toContain('<Admin>');
  });
});
