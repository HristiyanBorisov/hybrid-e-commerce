<?php

namespace Tests\Feature\Catalog;

use App\Jobs\ProcessProductImage;
use App\Models\Category;
use App\Models\Product;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** The catalog's model rules: versions, slugs, the category tree and the demo data. */
final class ModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_version_goes_up_on_every_change_including_soft_delete_and_restore(): void
    {
        $product = Product::factory()->create();
        $this->assertSame(1, $product->version);

        $product->update(['name' => 'Changed']);
        $this->assertSame(2, $product->fresh()->version);

        $product->delete();
        $this->assertSame(3, $product->version);
        $this->assertSame(3, Product::withTrashed()->find($product->id)->version);

        $product->restore();
        $this->assertSame(4, $product->fresh()->version);
    }

    public function test_the_slug_follows_the_name_and_stays_unique_also_against_trashed_products(): void
    {
        Product::factory()->create(['name' => 'Desk Lamp'])->delete();

        $product = Product::factory()->create(['name' => 'Desk Lamp']);
        $this->assertSame('desk-lamp-2', $product->slug);

        $product->update(['name' => 'Floor Lamp']);
        $this->assertSame('floor-lamp', $product->slug);

        $product->update(['description' => 'Unrelated change']);
        $this->assertSame('floor-lamp', $product->fresh()->slug);
    }

    public function test_a_name_without_letters_still_gets_a_slug(): void
    {
        $this->assertSame('item', Category::factory()->create(['name' => '!!!'])->slug);
    }

    public function test_descendants_are_found_at_any_depth(): void
    {
        $electronics = Category::factory()->create();
        $phones = Category::factory()->childOf($electronics)->create();
        $smartphones = Category::factory()->childOf($phones)->create();
        Category::factory()->create(); // unrelated

        $this->assertEqualsCanonicalizing([$phones->id, $smartphones->id], $electronics->descendantIds());
        $this->assertSame([], $smartphones->descendantIds());
        $this->assertSame($electronics->id, $phones->parent->id);
        $this->assertCount(1, $electronics->children);
    }

    public function test_a_thumbnail_job_for_a_product_that_is_gone_or_has_no_image_does_nothing(): void
    {
        $withoutImage = Product::factory()->create();

        $this->app->call([new ProcessProductImage($withoutImage->id), 'handle']);
        $this->app->call([new ProcessProductImage('0199e3a0-0000-7000-8000-000000000003'), 'handle']);

        $this->assertNull($withoutImage->fresh()->thumbnail_path);
    }

    public function test_the_demo_catalog_can_be_seeded_again_without_duplicates(): void
    {
        $this->seed(CatalogSeeder::class);
        $this->seed(CatalogSeeder::class);

        $this->assertSame(9, Category::count());
        $this->assertSame(12, Product::count());
        $this->assertSame('phones', Product::where('sku', 'PHN-001')->sole()->category->slug);
    }
}
