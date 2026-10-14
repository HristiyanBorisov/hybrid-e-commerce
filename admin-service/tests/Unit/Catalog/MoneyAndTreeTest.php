<?php

namespace Tests\Unit\Catalog;

use App\Dto\Categories\CategoryTreeItemDto;
use App\Enums\ImportStatus;
use App\Enums\TrashedFilter;
use App\Support\Money;
use PHPUnit\Framework\TestCase;

final class MoneyAndTreeTest extends TestCase
{
    public function test_prices_turn_into_exact_cents_and_back(): void
    {
        $this->assertSame(1999, Money::toCents('19.99'));
        $this->assertSame(29, Money::toCents('0.29')); // 0.29 * 100 is 28.999… in floating point
        $this->assertSame(4900, Money::toCents(49));
        $this->assertSame('19.99', Money::toDecimal(1999));
        $this->assertSame('1234.50', Money::toDecimal(123450));
        $this->assertSame('1,234.50', Money::format(123450));
    }

    public function test_tree_items_are_indented_by_depth_and_know_when_they_are_in_use(): void
    {
        $empty = new CategoryTreeItemDto('1', 'Phones', 'phones', depth: 2, productCount: 0, childCount: 0);
        $used = new CategoryTreeItemDto('2', 'Books', 'books', depth: 0, productCount: 3, childCount: 0);

        $this->assertSame('— — Phones', $empty->indentedName());
        $this->assertSame('Books', $used->indentedName());
        $this->assertFalse($empty->isInUse());
        $this->assertTrue($used->isInUse());
    }

    public function test_enums_have_readable_labels(): void
    {
        $this->assertSame('Processing', ImportStatus::Processing->label());
        $this->assertSame('Active', TrashedFilter::Without->label());
        $this->assertSame('Trashed', TrashedFilter::Only->label());
    }
}
