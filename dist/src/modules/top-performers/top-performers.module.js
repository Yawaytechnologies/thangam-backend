"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopPerformersModule = void 0;
const common_1 = require("@nestjs/common");
const top_performers_service_1 = require("./top-performers.service");
const top_performers_controller_1 = require("./top-performers.controller");
let TopPerformersModule = class TopPerformersModule {
};
exports.TopPerformersModule = TopPerformersModule;
exports.TopPerformersModule = TopPerformersModule = __decorate([
    (0, common_1.Module)({
        controllers: [top_performers_controller_1.TopPerformersController],
        providers: [top_performers_service_1.TopPerformersService],
        exports: [top_performers_service_1.TopPerformersService],
    })
], TopPerformersModule);
//# sourceMappingURL=top-performers.module.js.map