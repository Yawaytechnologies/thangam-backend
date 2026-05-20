import { OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class NotificationsGateway implements OnGatewayConnection {
    private readonly jwtService;
    private readonly configService;
    server: Server;
    constructor(jwtService: JwtService, configService: ConfigService);
    handleConnection(client: Socket): void;
    handlePing(_data: unknown, _client: Socket): string;
    emitToUser(userId: string, event: string, data: unknown): void;
}
