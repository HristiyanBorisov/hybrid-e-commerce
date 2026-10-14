<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Carbon\CarbonImmutable;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * COPY of an order from the API gateway, which owns orders. Written only by the sync and by the gateway's
 * answers to status changes — never edited here. The timestamps are the gateway's, so Eloquent doesn't set them.
 *
 * @property string $id UUIDv7, the gateway's id
 * @property string $customer_id
 * @property string $customer_name at the time of the order
 * @property string $customer_email at the time of the order
 * @property OrderStatus $status
 * @property int $total_cents
 * @property int $version
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 */
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'total_cents' => 'integer',
            'version' => 'integer',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class)->orderBy('id');
    }

    /**
     * Orders that count as a sale: paid, shipped or delivered.
     *
     * @param  Builder<Order>  $query
     */
    public function scopeSold(Builder $query): void
    {
        $query->whereIn('status', OrderStatus::sold());
    }
}
