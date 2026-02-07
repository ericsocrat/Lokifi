'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './admin.module.css';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading admin dashboard...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>Manage system configurations and content</p>
      </header>

      <nav className={styles.navigation}>
        <div className={styles.navGrid}>
          <Link href="/admin/email-templates" className={styles.navCard}>
            <div className={styles.navCardTitle}>Email Templates</div>
            <div className={styles.navCardDesc}>Manage reusable email templates</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>

          <Link href="/admin/api-keys" className={styles.navCard}>
            <div className={styles.navCardTitle}>API Keys</div>
            <div className={styles.navCardDesc}>Manage external API access keys</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>

          <Link href="/admin/audit-logs" className={styles.navCard}>
            <div className={styles.navCardTitle}>Audit Logs</div>
            <div className={styles.navCardDesc}>View system activity logs</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>

          <Link href="/admin/webhooks" className={styles.navCard}>
            <div className={styles.navCardTitle}>Webhooks</div>
            <div className={styles.navCardDesc}>Configure webhook endpoints and event subscriptions</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>

          <Link href="/admin/settings" className={styles.navCard}>
            <div className={styles.navCardTitle}>System Settings</div>
            <div className={styles.navCardDesc}>Configure system behavior</div>
            <div className={styles.navCardArrow}>→</div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
