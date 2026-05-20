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
exports.PropertyFilterDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class PropertyFilterDto {
    search;
    propertyType;
    workflowStatus;
    page = 1;
    limit = 20;
}
exports.PropertyFilterDto = PropertyFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search by name, code, plot number or project name',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PropertyFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.PropertyType,
        description: 'Filter by property type',
    }),
    (0, class_validator_1.IsEnum)(client_1.PropertyType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PropertyFilterDto.prototype, "propertyType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.WorkflowStatus,
        description: 'Filter by workflow status',
    }),
    (0, class_validator_1.IsEnum)(client_1.WorkflowStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PropertyFilterDto.prototype, "workflowStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 1, description: 'Page number (1-based)' }),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], PropertyFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        default: 20,
        description: 'Number of records per page',
    }),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10)),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], PropertyFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=property-filter.dto.js.map