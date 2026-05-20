"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendMessageDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class SendMessageDto {
    notificationId;
    recipientName;
    recipientRole;
    branchId;
    messageType;
    subject;
    body;
    relatedModule;
    relatedEntityId;
}
exports.SendMessageDto = SendMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the source notification to reply to' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "notificationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the recipient' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "recipientName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Role of the recipient' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "recipientRole", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Branch ID associated with this message',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "branchId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.MessageType, description: 'Type of message' }),
    (0, class_validator_1.IsEnum)(client_1.MessageType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "messageType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Subject of the message' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Body/content of the message' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "body", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Related module name (e.g. Booking, Billing)',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "relatedModule", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'ID of the related entity in the module',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SendMessageDto.prototype, "relatedEntityId", void 0);
//# sourceMappingURL=send-message.dto.js.map