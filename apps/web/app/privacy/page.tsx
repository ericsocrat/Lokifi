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
        asset research is a separate request without your holdings or quantities. Groq’s data policy applies to
        inference processing.
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
        or delete your account in Settings. Anonymous quota totals may remain for 31 days to protect the free allowance.
        Provider backups may retain deleted data briefly until their retention periods expire.
      </p>
      <h2>Beta status</h2>
      <p>
        This is an experimental portfolio tool. Essential session cookies are used for sign-in. No advertising trackers
        are required. The operator’s support contact is displayed in the application configuration before public
        registration opens.
      </p>
    </main>
  );
}
