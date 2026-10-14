<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * COPY of a product's stock from the API gateway, which owns stock. Written only by the sync and by the
 * gateway's answers to stock adjustments.
 *
 * @property string $product_id
 * @property int $quantity
 * @property int $version
 */
class StockLevel extends Model
{
    protected $primaryKey = 'product_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'version' => 'integer',
        ];
    }
}
