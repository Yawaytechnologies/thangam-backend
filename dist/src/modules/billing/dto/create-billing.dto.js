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
exports.CreateBillingDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateBillingDto {
    bookingId;
    buyerName;
    buyerAddress;
    buyerPhone;
    orderNumber;
    billingNumber;
    billingDate;
    paymentMethod;
    amountInNumbers;
    totalReceived;
    totalBalance;
    operationalNotes;
    settlementNotes;
    termsConditions;
    signatureUrl;
}
exports.CreateBillingDto = CreateBillingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "bookingId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Rajesh Kumar' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "buyerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '12, Anna Salai, Chennai - 600001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "buyerAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '9876543210' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "buyerPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ORD-2024-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "orderNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'BILL-2024-001' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "billingNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-15' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "billingDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.PaymentMethod, example: client_1.PaymentMethod.CASH }),
    (0, class_validator_1.IsEnum)(client_1.PaymentMethod),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 250000,
        description: 'Amount in numbers; amountInWords is auto-calculated',
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBillingDto.prototype, "amountInNumbers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 250000, description: 'Total amount received so far' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateBillingDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 0,
        description: 'Total balance remaining; defaults to 0 if not provided',
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateBillingDto.prototype, "totalBalance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Site visit completed, documents submitted.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "operationalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Final settlement due by 31st March 2024.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "settlementNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Payment is non-refundable.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "termsConditions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'https://storage.example.com/signatures/sig_001.png',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateBillingDto.prototype, "signatureUrl", void 0);
//# sourceMappingURL=create-billing.dto.js.map