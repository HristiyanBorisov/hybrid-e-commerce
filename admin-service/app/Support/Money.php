<?php

namespace App\Support;

/** Prices are stored as integer cents (exact maths); people type and read them as decimals. */
final class Money
{
    /** "19.99" → 1999 */
    public static function toCents(string|int|float $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    /** 1999 → "19.99" — for form fields and CSV files */
    public static function toDecimal(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    /** 123450 → "1,234.50" — for display */
    public static function format(int $cents): string
    {
        return number_format($cents / 100, 2);
    }
}
