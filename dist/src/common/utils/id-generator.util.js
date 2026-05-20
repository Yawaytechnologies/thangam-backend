"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMemberId = generateMemberId;
exports.generateBookingId = generateBookingId;
exports.generateBillingId = generateBillingId;
exports.generateBranchCode = generateBranchCode;
exports.generateAdminId = generateAdminId;
exports.generatePropertyId = generatePropertyId;
function generateMemberId(sequence) {
    return `STH-MEM-${String(sequence).padStart(4, '0')}`;
}
function generateBookingId(sequence) {
    return `STH-BK-${String(sequence).padStart(4, '0')}`;
}
function generateBillingId(sequence) {
    return `STH-BILL-${String(sequence).padStart(4, '0')}`;
}
function generateBranchCode(sequence) {
    return `STH-BR-${String(sequence).padStart(3, '0')}`;
}
function generateAdminId(sequence) {
    return `STH-ADM-${String(sequence).padStart(4, '0')}`;
}
function generatePropertyId(sequence) {
    return `STH-PROP-${String(sequence).padStart(4, '0')}`;
}
//# sourceMappingURL=id-generator.util.js.map