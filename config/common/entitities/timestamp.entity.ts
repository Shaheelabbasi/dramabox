import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export abstract class TimeStamps {
  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updated_at: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @DeleteDateColumn()
  deleted_at?: Date;
}
                                                                                                                 

export abstract class BaseTimestamps {
  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
