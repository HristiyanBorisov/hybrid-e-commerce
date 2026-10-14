import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSyncModule } from '../admin-sync/admin-sync.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { Product } from '../catalog/product.entity.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { MailModule } from '../mail/mail.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { CheckoutService } from './checkout.service.js';
import { ORDER_EMAILS_QUEUE, OrderEmails } from './order-emails.js';
import { OrderEmailsProcessor } from './order-emails.processor.js';
import { OrderItem } from './order-item.entity.js';
import { OrderUpdatesGateway } from './order-updates.gateway.js';
import { Order } from './order.entity.js';
import { OrdersController } from './orders.controller.js';
import { OrdersResolver } from './orders.resolver.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    BullModule.registerQueue({ name: ORDER_EMAILS_QUEUE }),
    InventoryModule,
    PaymentsModule,
    MailModule,
    AdminSyncModule,
    // The WebSocket checks the same login tokens
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    CheckoutService,
    OrderEmails,
    OrderEmailsProcessor,
    OrderUpdatesGateway,
    OrdersResolver,
  ],
})
export class OrdersModule {}
