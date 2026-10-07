import type { PayrollRow } from './data'

type ApiRow = Omit<PayrollRow, 'weekDate'> & { batchId: number; sourceRow: number }

export function normalizeApiRows(payload: unknown): PayrollRow[] {
  if (!payload || typeof payload !== 'object' || !('rows' in payload) || !Array.isArray(payload.rows)) {
    throw new Error('Payroll API returned an invalid row list')
  }
  return payload.rows.map((row: ApiRow) => {
    if (!row || typeof row !== 'object') {
      throw new Error('Payroll API returned an invalid row')
    }
    const iso = row.weekEnding
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      throw new Error('Payroll API returned an invalid week date')
    }
    const weekDate = new Date(`${iso}T00:00:00.000Z`)
    if (!Number.isFinite(weekDate.getTime()) || weekDate.toISOString().slice(0, 10) !== iso) {
      throw new Error('Payroll API returned an invalid week date')
    }
    return {
      ...row,
      weekEnding: `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`,
      weekDate,
    }
  })
}

export async function loadApiRows(): Promise<PayrollRow[]> {
  const response = await fetch('/api/v1/rows')
  if (!response.ok) throw new Error(`Payroll API request failed (${response.status})`)
  return normalizeApiRows(await response.json())
}
