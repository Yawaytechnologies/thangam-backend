"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageFilePipe = void 0;
const common_1 = require("@nestjs/common");
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
let ImageFilePipe = class ImageFilePipe {
    transform(file) {
        if (!file)
            throw new common_1.BadRequestException('Image file is required');
        if (!ALLOWED_MIME.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Only JPEG, PNG, and WebP images are allowed');
        }
        if (file.size > MAX_BYTES) {
            throw new common_1.BadRequestException('Image must be 5 MB or smaller');
        }
        return file;
    }
};
exports.ImageFilePipe = ImageFilePipe;
exports.ImageFilePipe = ImageFilePipe = __decorate([
    (0, common_1.Injectable)()
], ImageFilePipe);
//# sourceMappingURL=image-file.pipe.js.map