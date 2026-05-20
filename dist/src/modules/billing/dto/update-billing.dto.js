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
exports.UpdateBillingDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class UpdateBillingDto {
    paymentMethod;
    amountInNumbers;
    totalReceived;
    operationalNotes;
    settlementNotes;
    termsConditions;
    status;
}
exports.UpdateBillingDto = UpdateBillingDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.PaymentMethod }),
    (0, class_validator_1.IsEnum)(client_1.PaymentMethod),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBillingDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 300000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateBillingDto.prototype, "amountInNumbers", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 300000 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateBillingDto.prototype, "totalReceived", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Site visit completed, additional documents pending.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBillingDto.prototype, "operationalNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Remaining balance to be settled by Q2.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBillingDto.prototype, "settlementNotes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Payment is non-refundable after 7 days.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBillingDto.prototype, "termsConditions", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.BillingStatus }),
    (0, class_validator_1.IsEnum)(client_1.BillingStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateBillingDto.prototype, "status", void 0);
//# sourceMappingURL=update-billing.dto.js.map