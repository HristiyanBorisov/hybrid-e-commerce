import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { mailConfig } from '../config/mail.config.js';
import { MailMessageDto } from './mail-message.dto.js';

/** Sends email over SMTP (nodemailer). Locally every email lands in Mailpit. */
@Injectable()
export class Mailer implements OnModuleDestroy {
  private readonly transport: Transporter;

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {
    this.transport = createTransport({ host: config.host, port: config.port });
  }

  async send(message: MailMessageDto): Promise<void> {
    await this.transport.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }

  onModuleDestroy(): void {
    this.transport.close();
  }
}
