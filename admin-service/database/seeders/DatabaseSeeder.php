<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Demo data (`make seed`). Users are seeded by the API gateway, which owns them. */
    public function run(): void
    {
        $this->call(CatalogSeeder::class);
    }
}
