import { CreateProductDto } from './create-product.dto.js';

/** Body of PUT /products/:id. PUT replaces the whole product, so it takes the same fields as creating one. */
export class UpdateProductDto extends CreateProductDto {}
