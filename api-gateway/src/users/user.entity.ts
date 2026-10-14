import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  UpdateDateColumn,
} from 'typeorm';
import { UuidEntity } from '../database/uuid.entity.js';
import { UserRole } from './user-role.enum.js';

/**
 * A customer or an admin. This service is the only owner of users (the central user service).
 * Soft-deleted: TypeORM leaves deleted users out of every normal query.
 */
@Entity('users')
export class User extends UuidEntity {
  @Column()
  name: string;

  /** Always lowercase (enforced by a CHECK in the database) */
  @Column()
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.Customer,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
