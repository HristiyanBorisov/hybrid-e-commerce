<?php

namespace App\Enums;

/** Mirrors the PostgreSQL enum type `order_status` (and the API gateway's OrderStatus). */
enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    /** @return list<self> the statuses that count as a sale (revenue, reports) */
    public static function sold(): array
    {
        return [self::Paid, self::Shipped, self::Delivered];
    }

    /**
     * Where an order can go from this status. The API gateway enforces these rules;
     * the admin panel only uses them to offer the right buttons.
     *
     * @return list<self>
     */
    public function nextStatuses(): array
    {
        return match ($this) {
            self::Pending => [self::Paid, self::Cancelled],
            self::Paid => [self::Shipped, self::Cancelled],
            self::Shipped => [self::Delivered],
            self::Delivered, self::Cancelled => [],
        };
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }

    /** The button that moves an order to this status */
    public function actionLabel(): string
    {
        return $this === self::Cancelled ? 'Cancel order' : "Mark as {$this->value}";
    }
}
