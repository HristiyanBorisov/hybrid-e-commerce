import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { CheckoutService } from './checkout.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { OrderListResponseDto } from './dto/order-list-response.dto.js';
import { OrderResponseDto } from './dto/order-response.dto.js';
import { OrderStatus } from './order-status.enum.js';
import { OrdersService } from './orders.service.js';

/** Orders in GraphQL — the same services and rules as /api/v1/orders. */
@Resolver(() => OrderResponseDto)
export class OrdersResolver {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly ordersService: OrdersService,
  ) {}

  @Query(() => OrderListResponseDto, {
    description: 'Your orders, newest first',
  })
  async myOrders(
    @Args() query: ListOrdersQueryDto,
    @CurrentUser() user: User,
  ): Promise<OrderListResponseDto> {
    const [orders, total] = await this.ordersService.listForCustomer(
      user.id,
      query,
    );

    return OrderListResponseDto.of(orders, query, total);
  }

  @Query(() => OrderResponseDto, {
    description: 'One of your orders (admins: any order)',
  })
  async order(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto> {
    return OrderResponseDto.fromEntity(
      await this.ordersService.findVisibleTo(user, id),
    );
  }

  @Mutation(() => OrderResponseDto, {
    description:
      'Place an order: the stock is checked and taken, the payment charged, a confirmation emailed',
  })
  async placeOrder(
    @Args('input') input: CreateOrderDto,
    @CurrentUser() customer: User,
  ): Promise<OrderResponseDto> {
    return OrderResponseDto.fromEntity(
      await this.checkout.placeOrder(customer, input),
    );
  }

  @Roles(UserRole.Admin)
  @Mutation(() => OrderResponseDto, {
    description: 'Move an order to another status (admins)',
  })
  async changeOrderStatus(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('status', { type: () => OrderStatus }) status: OrderStatus,
  ): Promise<OrderResponseDto> {
    return OrderResponseDto.fromEntity(
      await this.ordersService.changeStatus(id, status),
    );
  }
}
