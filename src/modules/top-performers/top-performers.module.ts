import { Module } from '@nestjs/common';
import { TopPerformersService } from './top-performers.service';
import { TopPerformersController } from './top-performers.controller';

@Module({
  controllers: [TopPerformersController],
  providers: [TopPerformersService],
  exports: [TopPerformersService],
})
export class TopPerformersModule {}
