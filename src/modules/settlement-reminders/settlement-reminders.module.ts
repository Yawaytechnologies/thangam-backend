import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettlementRemindersService } from './settlement-reminders.service';

@Module({
  imports: [NotificationsModule],
  providers: [SettlementRemindersService],
})
export class SettlementRemindersModule {}
