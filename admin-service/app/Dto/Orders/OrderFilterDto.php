<?php

namespace App\Dto\Orders;

use App\Enums\OrderStatus;
use Carbon\CarbonImmutable;

/** How to filter the order list. */
final readonly class OrderFilterDto
{
    public const PER_PAGE = 20;

    public function __construct(
        public ?OrderStatus $status = null,
        /** Part of the customer's name or email */
        public ?string $search = null,
        /** Placed on or after this day */
        public ?CarbonImmutable $from = null,
        /** Placed on or before this day */
        public ?CarbonImmutable $to = null,
    ) {}
}
