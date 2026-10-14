<?php

namespace Tests\Feature\Catalog;

use App\Jobs\SyncCategoryToGateway;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class CategoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_list_shows_the_tree_with_counts(): void
    {
        $electronics = Category::factory()->create(['name' => 'Electronics']);
        $phones = Category::factory()->childOf($electronics)->create(['name' => 'Phones']);
        Product::factory()->for($phones)->count(2)->create();

        $this->actingAsAdmin()
            ->get('/admin/categories')
            ->assertOk()
            ->assertSeeInOrder(['Electronics', 'Phones'])
            ->assertSee('phones');
    }

    public function test_an_admin_creates_a_category_and_its_slug_is_generated(): void
    {
        $parent = Category::factory()->create(['name' => 'Electronics']);

        $this->actingAsAdmin()
            ->post('/admin/categories', ['name' => 'Smart Phones', 'parent_id' => $parent->id])
            ->assertRedirect('/admin/categories')
            ->assertSessionHas('status', 'Category "Smart Phones" created.');

        $category = Category::where('name', 'Smart Phones')->sole();
        $this->assertSame('smart-phones', $category->slug);
        $this->assertSame($parent->id, $category->parent_id);
        $this->assertSame(1, $category->version);
        Queue::assertPushed(SyncCategoryToGateway::class, fn ($job) => $job->categoryId === $category->id);
    }

    public function test_the_create_form_lists_every_category_as_a_possible_parent(): void
    {
        Category::factory()->create(['name' => 'Electronics']);

        $this->actingAsAdmin()->get('/admin/categories/create')->assertOk()->assertSee('Electronics');
    }

    public function test_slugs_stay_unique(): void
    {
        Category::factory()->create(['name' => 'Phones']);

        $this->actingAsAdmin()->post('/admin/categories', ['name' => 'Phones']);

        $this->assertSame(['phones', 'phones-2'], Category::orderBy('slug')->pluck('slug')->all());
    }

    public function test_the_form_is_validated(): void
    {
        $this->actingAsAdmin()
            ->post('/admin/categories', ['name' => '', 'parent_id' => '0199e3a0-0000-7000-8000-000000000000'])
            ->assertSessionHasErrors(['name', 'parent_id']);
    }

    public function test_the_edit_form_does_not_offer_the_category_or_its_subcategories_as_parent(): void
    {
        $electronics = Category::factory()->create(['name' => 'Electronics']);
        $phones = Category::factory()->childOf($electronics)->create(['name' => 'Phones']);
        Category::factory()->childOf($phones)->create(['name' => 'Smartphones']);
        Category::factory()->create(['name' => 'Books']);

        $this->actingAsAdmin()
            ->get("/admin/categories/{$electronics->id}/edit")
            ->assertOk()
            ->assertSee('Books')
            ->assertDontSee('Smartphones');
    }

    public function test_renaming_updates_the_slug_and_the_version(): void
    {
        $category = Category::factory()->create(['name' => 'Phones']);

        $this->actingAsAdmin()
            ->put("/admin/categories/{$category->id}", ['name' => 'Mobile Phones'])
            ->assertRedirect('/admin/categories')
            ->assertSessionHas('status', 'Category "Mobile Phones" updated.');

        $category->refresh();
        $this->assertSame('mobile-phones', $category->slug);
        $this->assertSame(2, $category->version);
    }

    public function test_a_category_cannot_move_below_its_own_subcategory(): void
    {
        $electronics = Category::factory()->create();
        $phones = Category::factory()->childOf($electronics)->create();
        $smartphones = Category::factory()->childOf($phones)->create();

        $this->actingAsAdmin()
            ->put("/admin/categories/{$electronics->id}", ['name' => 'Electronics', 'parent_id' => $smartphones->id])
            ->assertSessionHasErrors(['parent_id' => "A category can't be moved below itself or one of its subcategories."]);

        $this->actingAsAdmin()
            ->put("/admin/categories/{$electronics->id}", ['name' => 'Electronics', 'parent_id' => $electronics->id])
            ->assertSessionHasErrors('parent_id');

        $this->assertNull($electronics->refresh()->parent_id);
    }

    public function test_an_empty_category_can_be_deleted(): void
    {
        $category = Category::factory()->create(['name' => 'Old']);

        $this->actingAsAdmin()
            ->delete("/admin/categories/{$category->id}")
            ->assertRedirect('/admin/categories')
            ->assertSessionHas('status', 'Category "Old" deleted.');

        $this->assertModelMissing($category);
        Queue::assertPushed(SyncCategoryToGateway::class, 2); // created + deleted
    }

    public function test_a_category_with_subcategories_or_products_cannot_be_deleted(): void
    {
        $withChild = Category::factory()->create(['name' => 'Parent']);
        Category::factory()->childOf($withChild)->create();
        $withTrashedProduct = Category::factory()->create(['name' => 'Shelf']);
        Product::factory()->for($withTrashedProduct)->create()->delete();

        foreach ([$withChild, $withTrashedProduct] as $category) {
            $this->actingAsAdmin()
                ->from('/admin/categories')
                ->delete("/admin/categories/{$category->id}")
                ->assertRedirect('/admin/categories')
                ->assertSessionHas('error', "\"{$category->name}\" still has subcategories or products — move or delete them first.");

            $this->assertModelExists($category);
        }
    }

    public function test_a_malformed_id_is_a_404(): void
    {
        $this->actingAsAdmin()->get('/admin/categories/not-a-uuid/edit')->assertNotFound();
    }
}
