<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/** Where product images live (the "public" disk, served at /storage) and how their thumbnails are made. */
final class ProductImageStorage
{
    private const DISK = 'public';

    private const THUMBNAIL_SIZE = 400;

    /** Stores an upload under a random name and returns its path, e.g. "products/4f9c….jpg". */
    public function store(UploadedFile $image): string
    {
        return $image->store('products', self::DISK);
    }

    /** Makes a 400×400 WebP thumbnail (cropped to fill the square) and returns its path. */
    public function createThumbnail(string $imagePath): string
    {
        $thumbnailPath = 'products/thumbnails/'.pathinfo($imagePath, PATHINFO_FILENAME).'.webp';

        $thumbnail = ImageManager::usingDriver(GdDriver::class)
            ->decode(Storage::disk(self::DISK)->get($imagePath))
            ->cover(self::THUMBNAIL_SIZE, self::THUMBNAIL_SIZE)
            ->encode(new WebpEncoder(quality: 80));

        Storage::disk(self::DISK)->put($thumbnailPath, (string) $thumbnail);

        return $thumbnailPath;
    }

    public function delete(?string ...$paths): void
    {
        Storage::disk(self::DISK)->delete(array_values(array_filter($paths)));
    }
}
