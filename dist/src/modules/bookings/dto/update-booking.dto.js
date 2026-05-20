"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBookingDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_booking_dto_1 = require("./create-booking.dto");
class UpdateBookingDto extends (0, swagger_1.PartialType)(create_booking_dto_1.CreateBookingDto) {
}
exports.UpdateBookingDto = UpdateBookingDto;
//# sourceMappingURL=update-booking.dto.js.map