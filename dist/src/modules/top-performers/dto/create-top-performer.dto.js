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
exports.CreateTopPerformerDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateTopPerformerDto {
    memberId;
    role;
    rank;
    displayOrder;
    taggedCount = 0;
    propertiesCount = 0;
}
exports.CreateTopPerformerDto = CreateTopPerformerDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID of the member', format: 'uuid' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTopPerformerDto.prototype, "memberId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.Role, description: 'Role of the top performer' }),
    (0, class_validator_1.IsEnum)(client_1.Role),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTopPerformerDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Rank position', minimum: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateTopPerformerDto.prototype, "rank", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Display order for UI rendering', minimum: 0 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTopPerformerDto.prototype, "displayOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of tagged members',
        default: 0,
        required: false,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTopPerformerDto.prototype, "taggedCount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of properties handled',
        default: 0,
        required: false,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateTopPerformerDto.prototype, "propertiesCount", void 0);
//# sourceMappingURL=create-top-performer.dto.js.map