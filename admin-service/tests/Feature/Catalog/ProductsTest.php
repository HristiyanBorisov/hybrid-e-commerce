<?php

namespace Tests\Feature\Catalog;

use App\Jobs\SyncProductToGateway;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class ProductsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    // ---- list

    public function test_the_list_shows_active_products_newest_first(): void
    {
        $older = Product::factory()->create(['name' => 'Older Lamp']);
        Product::factory()->create(['name' => 'Newer Chair']);
        Product::factory()->create(['name' => 'Trashed Table'])->delete();

        $this->actingAsAdmin()
            ->get('/admin/products')
            ->assertOk()
            ->assertSeeInOrder(['Newer Chair', $older->name])
            ->assertDontSee('Trashed Table');
    }

    public function test_the_list_searches_name_and_sku(): void
    {
        Product::factory()->create(['name' => 'Desk Lamp', 'sku' => 'LMP-1']);
        Product::factory()->create(['name' => 'Chair', 'sku' => 'CHR-1']);

        $this->actingAsAdmin()->get('/admin/products?search=lamp')->assertSee('Desk Lamp')->assertDontSee('CHR-1');
        $this->actingAsAdmin()->get('/admin/products?search=chr')->assertSee('Chair')->assertDontSee('Desk Lamp');
    }

    public function test_filtering_by_a_category_includes_its_subcategories(): void
    {
        $electronics = Category::factory()->create();
        $phones = Category::factory()->childOf($electronics)->create();
        Product::factory()->for($phones)->create(['name' => 'Pixel Phone']);
        Product::factory()->create(['name' => 'Cooking Pot']);

        $this->actingAsAdmin()
            ->get("/admin/products?category_id={$electronics->id}")
            ->assertSee('Pixel Phone')
            ->assertDontSee('Cooking Pot');
    }

    public function test_the_trash_shows_only_soft_deleted_products(): void
    {
        Product::factory()->create(['name' => 'Active Lamp']);
        Product::factory()->create(['name' => 'Trashed Table'])->delete();

        $this->actingAsAdmin()
            ->get('/admin/products?trashed=only')
            ->assertSee('Trashed Table')
            ->assertSee('Restore')
            ->assertDontSee('Active Lamp');
    }

    public function test_an_invalid_filter_is_rejected(): void
    {
        $this->actingAsAdmin()->get('/admin/products?trashed=everything')->assertSessionHasErrors('trashed');
    }

    // ---- create

    public function test_the_create_form_lists_the_categories(): void
    {
        Category::factory()->create(['name' => 'Kitchen']);

        $this->actingAsAdmin()->get('/admin/products/create')->assertOk()->assertSee('Kitchen');
    }

    public function test_an_admin_creates_a_product_with_an_image_and_gets_a_thumbnail(): void
    {
        $category = Category::factory()->create();

        $this->actingAsAdmin()
            ->post('/admin/products', [
                'category_id' => $category->id,
                'sku' => 'LMP-1',
                'name' => 'Desk Lamp',
                'price' => '19.99',
                'description' => 'Warm light.',
                'image' => UploadedFile::fake()->image('lamp.jpg', 800, 600),
            ])
            ->assertRedirect('/admin/products')
            ->assertSessionHas('status', 'Product "Desk Lamp" created.');

        $product = Product::sole();
        $this->assertSame(1999, $product->price_cents);
        $this->assertSame('desk-lamp', $product->slug);
        Storage::disk('public')->assertExists($product->image_path);

        // The (synchronous, in tests) queue already made the 400×400 WebP thumbnail
        Storage::disk('public')->assertExists($product->thumbnail_path);
        $this->assertSame([400, 400, IMAGETYPE_WEBP], array_slice(getimagesizefromstring(Storage::disk('public')->get($product->thumbnail_path)), 0, 3));
        Queue::assertPushed(SyncProductToGateway::class, fn ($job) => $job->productId === $product->id);
    }

    public function test_a_product_without_an_image_is_fine(): void
    {
        $this->actingAsAdmin()->post('/admin/products', [
            'category_id' => Category::factory()->create()->id,
            'sku' => 'CHR-1',
            'name' => 'Chair',
            'price' => '49',
        ])->assertRedirect('/admin/products');

        $this->assertNull(Product::sole()->image_path);
    }

    public function test_the_form_is_validated(): void
    {
        Product::factory()->create(['sku' => 'TAKEN'])->delete();

        $this->actingAsAdmin()
            ->post('/admin/products', [
                'category_id' => '0199e3a0-0000-7000-8000-000000000000',
                'sku' => 'TAKEN', // also taken by a product in the trash
                'name' => '',
                'price' => '12.345',
                'image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
            ])
            ->assertSessionHasErrors(['category_id', 'sku', 'name', 'price', 'image']);
    }

    // ---- edit

    public function test_the_edit_form_shows_the_product(): void
    {
        $product = Product::factory()->create(['name' => 'Desk Lamp', 'price_cents' => 1999]);

        $this->actingAsAdmin()
            ->get("/admin/products/{$product->id}/edit")
            ->assertOk()
            ->assertSee('Desk Lamp')
            ->assertSee('19.99');
    }

    public function test_updating_without_an_image_keeps_the_current_one(): void
    {
        $product = Product::factory()->create(['image_path' => 'products/old.jpg', 'thumbnail_path' => 'products/thumbnails/old.webp']);

        $this->actingAsAdmin()
            ->put("/admin/products/{$product->id}", [
                'category_id' => $product->category_id,
                'sku' => $product->sku,
                'name' => 'Renamed',
                'price' => '5.50',
            ])
            ->assertRedirect('/admin/products');

        $product->refresh();
        $this->assertSame(['Renamed', 550, 'products/old.jpg', 2], [$product->name, $product->price_cents, $product->image_path, $product->version]);
    }

    public function test_a_new_image_replaces_the_old_files(): void
    {
        Storage::disk('public')->put('products/old.jpg', 'old');
        Storage::disk('public')->put('products/thumbnails/old.webp', 'old');
        $product = Product::factory()->create(['image_path' => 'products/old.jpg', 'thumbnail_path' => 'products/thumbnails/old.webp']);

        $this->actingAsAdmin()->put("/admin/products/{$product->id}", [
            'category_id' => $product->category_id,
            'sku' => $product->sku,
            'name' => $product->name,
            'price' => '1.00',
            'image' => UploadedFile::fake()->image('new.png', 500, 500),
        ]);

        $product->refresh();
        Storage::disk('public')->assertMissing(['products/old.jpg', 'products/thumbnails/old.webp']);
        Storage::disk('public')->assertExists([$product->image_path, $product->thumbnail_path]);
    }

    // ---- delete and restore

    public function test_deleting_moves_the_product_to_the_trash_and_restoring_brings_it_back(): void
    {
        $product = Product::factory()->create(['name' => 'Desk Lamp']);

        $this->actingAsAdmin()
            ->from('/admin/products')
            ->delete("/admin/products/{$product->id}")
            ->assertRedirect('/admin/products')
            ->assertSessionHas('status', 'Product "Desk Lamp" moved to the trash.');

        $this->assertSoftDeleted($product);
        $this->assertSame(2, $product->fresh()->version);

        $this->actingAsAdmin()
            ->from('/admin/products?trashed=only')
            ->post("/admin/products/{$product->id}/restore")
            ->assertSessionHas('status', 'Product "Desk Lamp" restored.');

        $this->assertNotSoftDeleted($product);
        $this->assertSame(3, $product->fresh()->version);
        Queue::assertPushed(SyncProductToGateway::class, 3); // created, deleted, restored
    }

    // ---- export

    public function test_the_export_is_a_csv_that_the_import_can_read_again(): void
    {
        $phones = Category::factory()->create(['name' => 'Phones']);
        Product::factory()->for($phones)->create(['sku' => 'B-2', 'name' => 'Second', 'price_cents' => 1050, 'description' => 'Has, a comma']);
        Product::factory()->for($phones)->create(['sku' => 'A-1', 'name' => 'First', 'price_cents' => 1999, 'description' => null]);
        Product::factory()->create(['sku' => 'C-3'])->delete();

        $response = $this->actingAsAdmin()->get('/admin/products/export');

        $response->assertOk()->assertDownload('products-'.now()->format('Y-m-d').'.csv');
        $this->assertSame(
            "sku,name,category_slug,price,description\nA-1,First,phones,19.99,\nB-2,Second,phones,10.50,\"Has, a comma\"\n",
            $response->streamedContent(),
        );
    }
}
