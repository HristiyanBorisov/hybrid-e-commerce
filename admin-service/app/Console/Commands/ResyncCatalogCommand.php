<?php

namespace App\Console\Commands;

use App\Actions\Sync\ResyncCatalogAction;
use Illuminate\Console\Command;

/** `php artisan catalog:resync` (`make resync`): sends the whole catalog to the API gateway again. */
final class ResyncCatalogCommand extends Command
{
    protected $signature = 'catalog:resync {--now : Send it right away instead of through the queue}';

    protected $description = 'Send every category and product to the API gateway again';

    public function handle(ResyncCatalogAction $resync): int
    {
        $now = (bool) $this->option('now');
        $result = $resync->execute($now);

        $this->info(($now ? 'Sent to' : 'Queued for')." the API gateway — categories: {$result->categories}, products: {$result->products}.");

        return self::SUCCESS;
    }
}
