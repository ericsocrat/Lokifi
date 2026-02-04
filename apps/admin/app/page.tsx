import Link from "next/link";

const stats = [
  { label: "Active Users", value: "128,540" },
  { label: "Daily Trades", value: "42,110" },
  { label: "API Requests", value: "3.1M" },
  { label: "Alerts Triggered", value: "18,902" },
];

const modules = [
  {
    title: "User Management",
    description:
      "Search, verify, and manage user accounts with role-based access control.",
  },
  {
    title: "Content Moderation",
    description:
      "Review flagged posts, manage reports, and enforce community guidelines.",
  },
  {
    title: "Analytics",
    description:
      "Track growth, engagement, and revenue signals across the platform.",
  },
  {
    title: "System Controls",
    description:
      "Toggle feature flags, maintenance mode, and rate limit policies.",
  },
  {
    title: "API Operations",
    description:
      "Monitor API key usage, rotate credentials, and audit usage trends.",
  },
  {
    title: "Security Center",
    description:
      "Review alerts, anomalies, and audit logs in one consolidated view.",
  },
];

export default function AdminHome(): JSX.Element {
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo">L</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              Lokifi Admin
            </div>
            <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
              Command center for platform operations
            </div>
          </div>
        </div>
        <nav className="nav">
          <span>Overview</span>
          <span>Users</span>
          <span>Analytics</span>
          <span>System</span>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-card">
          <h1>Operational intelligence, in one place.</h1>
          <p>
            Monitor system health, manage users, and steer product operations with
            real-time insights and tooling designed for scale.
          </p>
          <div className="button-group">
            <Link href="/login" className="button">
              Launch Admin Console
            </Link>
            <Link href="/dashboard" className="button secondary">
              View API Health
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <h2 style={{ marginTop: 0 }}>Live Snapshot</h2>
          <div className="stats">
            {stats.map((stat) => (
              <div className="stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid">
        {modules.map((module) => (
          <div className="card" key={module.title}>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
          </div>
        ))}
      </section>

      <footer className="footer">
        Lokifi Admin • Secure operations console • Phase 4 MVP
      </footer>
    </div>
  );
}
