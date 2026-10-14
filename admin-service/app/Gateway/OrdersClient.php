<?php

namespace App\Gateway;

use App\Dto\Orders\OrderStatusDto;
use App\Enums\OrderStatus;

/** Orders are owned by the API gateway: status changes go through it (/api/v1/orders, admins only). */
final readonly class OrdersClient
{
    public function __construct(private GatewayClient $gateway) {}

    /** A move the gateway doesn't allow is a 409, shown to the admin as an error. */
    public function changeStatus(string $orderId, OrderStatus $status): OrderStatusDto
    {
        return OrderStatusDto::fromArray(
            $this->gateway->patch("orders/{$orderId}/status", ['status' => $status->value]),
        );
    }
}
