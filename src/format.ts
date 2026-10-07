export const money = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

export const number = (value: number, digits = 0) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

export const percent = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value)

export const weekLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
