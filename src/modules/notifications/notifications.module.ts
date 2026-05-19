import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './gateway/notifications.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') as string,
        signOptions: { expiresIn: configService.get('jwt.expiresIn') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    {
      provide: 'GATEWAY_INIT',
      useFactory: (
        service: NotificationsService,
        gateway: NotificationsGateway,
      ) => {
        service.setGateway(gateway);
      },
      inject: [NotificationsService, NotificationsGateway],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
