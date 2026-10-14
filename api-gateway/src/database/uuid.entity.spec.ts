import { validate as isUuid, version as uuidVersion } from 'uuid';
import { UuidEntity } from './uuid.entity.js';

class ExampleEntity extends UuidEntity {}

describe('UuidEntity', () => {
  it('gets a UUIDv7 id as soon as it is created', () => {
    const { id } = new ExampleEntity();

    expect(isUuid(id)).toBe(true);
    expect(uuidVersion(id)).toBe(7);
  });

  it('gives every entity its own id, in creation order', () => {
    const ids = Array.from({ length: 50 }, () => new ExampleEntity().id);

    expect(new Set(ids).size).toBe(50);
    expect([...ids].sort()).toEqual(ids);
  });
});
