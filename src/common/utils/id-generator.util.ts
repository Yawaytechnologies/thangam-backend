export function generateMemberId(sequence: number): string {
  return `STH-MEM-${String(sequence).padStart(4, '0')}`;
}

export function generateBookingId(sequence: number): string {
  return `STH-BK-${String(sequence).padStart(4, '0')}`;
}

export function generateBillingId(sequence: number): string {
  return `STH-BILL-${String(sequence).padStart(4, '0')}`;
}

export function generateBranchCode(sequence: number): string {
  return `STH-BR-${String(sequence).padStart(3, '0')}`;
}

export function generateAdminId(sequence: number): string {
  return `STH-ADM-${String(sequence).padStart(4, '0')}`;
}

export function generatePropertyId(sequence: number): string {
  return `STH-PROP-${String(sequence).padStart(4, '0')}`;
}
