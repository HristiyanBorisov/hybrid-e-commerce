import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { CheckoutService } from './checkout.service.js';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { OrderListResponseDto } from './dto/order-list-response.dto.js';
import { OrderResponseDto } from './dto/order-response.dto.js';
import { OrdersService } from './orders.service.js';

/** Orders: every logged-in user can order; admins manage the status. */
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly ordersService: OrdersService,
  ) {}

  /** Place an order: the stock is checked and taken, the payment charged, a confirmation emailed */
  @Post()
  @ApiConflictResponse({
    description:
      'Not enough stock for one of the products — nothing was ordered',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 402,
    description:
      'Payment declined — the order is cancelled and its stock put back',
    type: ErrorResponseDto,
  })
  async place(
    @Body() data: CreateOrderDto,
    @CurrentUser() customer: User,
  ): Promise<OrderResponseDto> {
    return OrderResponseDto.fromEntity(
      await this.checkout.placeOrder(customer, data),
    );
  }

  /** Your orders, newest first */
  @Get()
  async list(
    @Query() query: ListOrdersQueryDto,
    @CurrentUser() user: User,
  ): Promise<OrderListResponseDto> {
    const [orders, total] = await this.ordersService.listForCustomer(
      user.id,
      query,
    );

    return OrderListResponseDto.of(orders, query, total);
  }

  /** One of your orders (admins: any order) */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto> {
    return OrderResponseDto.fromEntity(
      await this.ordersService.findVisibleTo(user, id),
    );
  }

  /** Move an order to another status (admins). Cancelling puts its items back into stock. */
  @Roles(UserRole.Admin)
  @Patch(':id/status')
  @ApiConflictResponse({
    description: "The order can't move to that status",
    type: ErrorResponseDto,
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: ChangeOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return OrderResponseDto.fromEntity(
      await this.ordersService.changeStatus(id, data.status),
    );
  }
}
