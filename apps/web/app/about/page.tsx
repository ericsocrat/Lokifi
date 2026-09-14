export default function Page() {
  return (
    <main className="standalone">
      <a href="/dashboard">← Lokifi</a>
      <h1>About the Lokifi beta</h1>
      <p>
        Lokifi helps you understand and manage records of your investments. It does not execute trades or move funds.
      </p>
      <h2>Data and AI</h2>
      <p>
        Crypto references use Coinbase Exchange. A daily closing reference may differ from the price you paid. Missing
        data stays unknown. AI can make mistakes; inspect sources and review every proposed change before confirming.
      </p>
      <h2>Free service limits</h2>
      <p>
        The API may take about one minute to start after inactivity. AI is limited to five turns per verified account
        per day and a shared application allowance. Exhausted free quotas can temporarily disable features. There are no
        paid fallbacks or local AI models.
      </p>
      <p>Your saved portfolio remains available when AI is unavailable. Export a copy of records you need to retain.</p>
    </main>
  );
}
