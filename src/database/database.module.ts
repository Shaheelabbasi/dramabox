import { Global, Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppDataSource } from '../../config/db/typeorm.config';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => AppDataSource.options as TypeOrmModuleOptions,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
