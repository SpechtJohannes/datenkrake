import './App.css'
import { Dashboard } from './dashboard/Dashboard'

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Datenkrake</p>
        <h1>Ticket-Dashboard</h1>
        <p>Technische Vorschau der lokal geladenen Redmine-Ticketdaten</p>
      </header>
      <Dashboard />
    </main>
  )
}

export default App
