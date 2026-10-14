import { registerAs } from '@nestjs/config';

/** Outgoing email (SMTP), injected with `@Inject(mailConfig.KEY)`. Locally everything goes to Mailpit. */
export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  from: process.env.MAIL_FROM ?? '',
}));
