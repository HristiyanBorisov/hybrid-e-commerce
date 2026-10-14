import { formatCents } from '../common/money.js';
import { MailMessageDto } from '../mail/mail-message.dto.js';
import { Order } from './order.entity.js';

/** The email a customer gets once their order is paid. The order must be loaded with its items and its user. */
export function orderConfirmationEmail(order: Order): MailMessageDto {
  const total = formatCents(order.totalCents);
  const lines = order.items.map((item) => ({
    quantity: item.quantity,
    name: item.productName,
    amount: formatCents(item.unitPriceCents * item.quantity),
  }));

  return {
    to: order.user.email,
    subject: `Your order is confirmed (${total})`,
    text: [
      `Hi ${order.user.name},`,
      '',
      'Thank you for your order. We have received your payment.',
      '',
      ...lines.map((line) => `${line.quantity} × ${line.name}: ${line.amount}`),
      '',
      `Total: ${total}`,
      `Order number: ${order.id}`,
      '',
      "We'll let you know when it ships.",
    ].join('\n'),
    html: [
      `<p>Hi ${escapeHtml(order.user.name)},</p>`,
      '<p>Thank you for your order. We have received your payment.</p>',
      '<table cellpadding="4">',
      ...lines.map(
        (line) =>
          `<tr><td>${line.quantity} ×</td><td>${escapeHtml(line.name)}</td><td align="right">${line.amount}</td></tr>`,
      ),
      `<tr><td></td><td><strong>Total</strong></td><td align="right"><strong>${total}</strong></td></tr>`,
      '</table>',
      `<p>Order number: ${order.id}</p>`,
      "<p>We'll let you know when it ships.</p>",
    ].join('\n'),
  };
}

/** Names come from users and admins — never put them into HTML unescaped. */
function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) => `&#${character.charCodeAt(0)};`,
  );
}
