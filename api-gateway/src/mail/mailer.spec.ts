import type { ConfigType } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { mailConfig } from '../config/mail.config.js';
import { Mailer } from './mailer.js';

vi.mock('nodemailer', () => ({ createTransport: vi.fn() }));

describe('Mailer', () => {
  const transport = { sendMail: vi.fn(), close: vi.fn() };
  vi.mocked(createTransport).mockReturnValue(transport as never);

  const mailer = new Mailer({
    host: 'mailpit',
    port: 1025,
    from: 'Shop <orders@shop.test>',
  } as ConfigType<typeof mailConfig>);

  it('sends over SMTP to the configured server, from the configured sender', async () => {
    await mailer.send({
      to: 'alice@example.com',
      subject: 'Hello',
      text: 'Hi',
      html: '<p>Hi</p>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'mailpit',
      port: 1025,
    });
    expect(transport.sendMail).toHaveBeenCalledWith({
      from: 'Shop <orders@shop.test>',
      to: 'alice@example.com',
      subject: 'Hello',
      text: 'Hi',
      html: '<p>Hi</p>',
    });
  });

  it('closes the connection when the app stops', () => {
    mailer.onModuleDestroy();

    expect(transport.close).toHaveBeenCalled();
  });
});
