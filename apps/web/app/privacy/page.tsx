export default function Page() {
  return (
    <main className="standalone">
      <a href="/dashboard">← Lokifi</a>
      <h1>Privacy & your data</h1>
      <p>
        Lokifi stores account details, holdings, dated valuations and watchlists to provide your portfolio workspace.
        Passwords are hashed; session tokens and provider credentials are not sent to the AI model.
      </p>
      <h2>Optional AI processing</h2>
      <p>
        With your consent, your chat messages and relevant records from the selected portfolio are sent to Groq. Public
        asset research is currently disabled. Groq inference zero-data-retention is enabled for this beta. Groq’s data
        policy applies to inference processing, which may take place outside the EU.
      </p>
      <p>
        <a href="https://console.groq.com/docs/your-data" rel="noreferrer">
          Groq data policy
        </a>
      </p>
      <h2>Hosting</h2>
      <p>
        The website is served by Cloudflare, application processing by Render, and the database by Neon in the EU.
        Verification and recovery email uses Resend. Bot protection uses Cloudflare Turnstile.
      </p>
      <h2>Retention and control</h2>
      <p>
        Chat content expires after 30 days. You can export your records, delete individual chats, delete all chat data,
        or delete your account in Settings. Quota usage records remain for up to 31 days to protect the free allowance;
        deleting your account removes their account association. Provider backups may retain deleted data briefly until
        their retention periods expire.
      </p>
      <h2>Beta status</h2>
      <p>
        This is an experimental portfolio tool. Essential session cookies are used for sign-in. No advertising trackers
        are required. For support or data requests, contact <a href="mailto:support@lokifi.com">support@lokifi.com</a>.
      </p>
    </main>
  );
}
