<?php

namespace App\Jobs;

use App\Actions\Sync\SyncProductAction;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Sends a changed product to the API gateway. Retried with growing pauses while the gateway is unreachable. */
final class SyncProductToGateway implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @var list<int> seconds to wait before each retry */
    public array $backoff = [10, 30, 60, 120];

    public function __construct(public readonly string $productId) {}

    public function handle(SyncProductAction $sync): void
    {
        $sync->execute($this->productId);
    }
}
