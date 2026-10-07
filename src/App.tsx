import { getOverview, payrollRows } from './data'

export default function App() {
  const overview = getOverview(payrollRows)
  return (
    <main className="app-shell">
      <p className="eyebrow">Project payroll / reporting</p>
      <h1>Payroll overview</h1>
      <p>{overview.records} weekly records for {overview.employees} employees are loaded from the local CSV.</p>
    </main>
  )
}
