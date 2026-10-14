import { PrimaryColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

/**
 * Base class for entities whose id is created by this service.
 *
 * The UUIDv7 id is assigned as soon as the object is created, so it's known before the row is saved.
 * v7 ids start with a timestamp, so new rows are added at the end of the index.
 */
export abstract class UuidEntity {
  @PrimaryColumn('uuid')
  id: string = uuidv7();
}
