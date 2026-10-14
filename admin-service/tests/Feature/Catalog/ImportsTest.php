<?php

namespace Tests\Feature\Catalog;

use App\Enums\ImportStatus;
use App\Jobs\ImportProductsCsv;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

final class ImportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    public function test_the_page_shows_the_upload_form_and_the_latest_imports(): void
    {
        ProductImport::create(['file_name' => 'spring.csv', 'file_path' => 'imports/spring.csv', 'status' => ImportStatus::Completed]);

        $this->actingAsAdmin()
            ->get('/admin/imports')
            ->assertOk()
            ->assertSee('sku,name,category_slug,price,description')
            ->assertSee('spring.csv')
            ->assertSee('Completed');
    }

    public function test_rows_create_or_update_products_by_sku_and_invalid_rows_are_reported(): void
    {
        $phones = Category::factory()->create(['name' => 'Phones']);
        $existing = Product::factory()->for($phones)->create(['sku' => 'PHN-1', 'name' => 'Old Name', 'price_cents' => 1000]);

        $this->actingAsAdmin()
            ->post('/admin/imports', ['file' => $this->csv(
                "\u{FEFF}SKU,Name,Category_Slug,Price,Description",       // header with a BOM and capitals
                'PHN-1,New Name,phones,12.50,Updated',                     // line 2: updates the existing product
                'PHN-2,Brand New,phones,99,',                              // line 3: creates a product
                'PHN-3,,phones,abc,',                                      // line 4: invalid
                'PHN-4,Lost,no-such-category,5,',                          // line 5: invalid
            )])
            ->assertRedirect('/admin/imports')
            ->assertSessionHas('status', '"products.csv" is being imported — refresh to see the result.');

        $import = ProductImport::sole();
        $this->assertSame(ImportStatus::Completed, $import->status);
        $this->assertSame([4, 2, 2], [$import->total_rows, $import->imported_rows, $import->failed_rows]);
        $this->assertSame([4, 5], array_column($import->errors, 'row'));
        $this->assertContains('The name field is required.', $import->errors[0]['messages']);
        $this->assertContains('The selected category slug is invalid.', $import->errors[1]['messages']);

        $this->assertSame(['New Name', 1250, 'Updated'], [$existing->fresh()->name, $existing->fresh()->price_cents, $existing->fresh()->description]);
        $this->assertSame(9900, Product::where('sku', 'PHN-2')->sole()->price_cents);
    }

    public function test_importing_the_same_file_twice_changes_nothing(): void
    {
        Category::factory()->create(['name' => 'Phones']);
        $file = fn () => $this->csv('sku,name,category_slug,price', 'PHN-1,Phone,phones,10');

        $this->actingAsAdmin()->post('/admin/imports', ['file' => $file()]);
        $this->actingAsAdmin()->post('/admin/imports', ['file' => $file()]);

        $this->assertSame(1, Product::count());
    }

    public function test_a_file_without_the_required_columns_fails(): void
    {
        $this->actingAsAdmin()->post('/admin/imports', ['file' => $this->csv('code,title', 'X,Y')]);

        $import = ProductImport::sole();
        $this->assertSame(ImportStatus::Failed, $import->status);
        $this->assertSame('Missing columns: sku, name, category_slug, price.', $import->errors[0]['messages'][0]);
    }

    public function test_an_empty_file_fails(): void
    {
        $this->actingAsAdmin()->post('/admin/imports', ['file' => UploadedFile::fake()->createWithContent('empty.csv', "\n")]);

        $this->assertSame('The file is empty.', ProductImport::sole()->errors[0]['messages'][0]);
    }

    public function test_only_csv_files_are_accepted(): void
    {
        $this->actingAsAdmin()
            ->post('/admin/imports', ['file' => UploadedFile::fake()->image('photo.jpg')])
            ->assertSessionHasErrors('file');

        $this->assertSame(0, ProductImport::count());
    }

    public function test_an_import_that_keeps_crashing_is_marked_failed(): void
    {
        $import = ProductImport::create(['file_name' => 'x.csv', 'file_path' => 'imports/x.csv']);

        (new ImportProductsCsv($import->id))->failed(new RuntimeException('Disk unavailable'));

        $this->assertSame(ImportStatus::Failed, $import->fresh()->status);
        $this->assertSame('Disk unavailable', $import->fresh()->errors[0]['messages'][0]);
    }

    private function csv(string ...$lines): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('products.csv', implode("\n", $lines)."\n");
    }
}
