import type { Alert, FarmingEvent } from '../types/robocare'

type AlertsCardProps = {
  alerts: Alert[]
  events: FarmingEvent[]
}

export function AlertsCard({ alerts, events }: AlertsCardProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Mocked API data</p>
          <h2>Alerts & calendar</h2>
        </div>
      </div>

      <div className="list-grid">
        <div>
          <h3>Alerts</h3>
          {alerts.map((alert) => (
            <article className={`list-item ${alert.level}`} key={alert.id}>
              <strong>{alert.title}</strong>
              <span>{alert.date} · {alert.level}</span>
            </article>
          ))}
        </div>

        <div>
          <h3>Events</h3>
          {events.map((event) => (
            <article className="list-item" key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.date} · {event.type}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
