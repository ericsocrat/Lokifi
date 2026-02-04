"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

interface SystemSettingsResponse {
  site_name: string;
  site_description: string;
  site_domain: string;
  site_logo_url?: string;
  email_from_address: string;
  email_from_name: string;
  email_smtp_host?: string;
  email_smtp_port?: number;
  email_smtp_username?: string;
  maintenance_mode: boolean;
  maintenance_message?: string;
  maintenance_allowed_ips: string;
  rate_limit_enabled: boolean;
  rate_limit_requests: number;
  rate_limit_window: number;
  session_timeout_minutes: number;
  require_email_verification: boolean;
  password_min_length: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  api_key_expiration_days: number;
  cors_allowed_origins: string;
  feature_flags: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  updated_by?: number;
}

interface SystemSettingsUpdate {
  [key: string]: unknown;
}

interface SettingsValidationResponse {
  is_valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsResponse | null>(null);
  const [formData, setFormData] = useState<SystemSettingsUpdate>({});
  const [validation, setValidation] = useState<SettingsValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load settings");
      }

      const data = (await response.json()) as SystemSettingsResponse;
      setSettings(data);
      setFormData({});
      setError(null);
    } catch (_err) {
      setError(
        _err instanceof Error ? _err.message : "Failed to load settings"
      );
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type, value } = e.target;
    const target = e.target as HTMLInputElement;

    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : parseInt(value, 10),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : value,
      }));
    }
  };

  const validateSettings = async () => {
    if (!formData || Object.keys(formData).length === 0) {
      setError("No changes to validate");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const data = (await response.json()) as SettingsValidationResponse;
      setValidation(data);

      if (data.is_valid) {
        setSuccess("✅ Settings validation passed - ready to save");
      } else {
        setError(
          `❌ Validation failed with ${Object.keys(data.errors).length} error(s)`
        );
      }
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : "Validation failed");
      setValidation(null);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!formData || Object.keys(formData).length === 0) {
      setError("No changes to save");
      return;
    }

    setSaveLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const data = (await response.json()) as SystemSettingsResponse;
      setSettings(data);
      setFormData({});
      setValidation(null);
      setError(null);
      setSuccess("✅ Settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleMaintenanceMode = async (enabled: boolean) => {
    setSaveLoading(true);
    try {
      const response = await fetch(
        `/api/admin/settings/maintenance-mode/${enabled}?message=System%20maintenance%20in%20progress...`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle maintenance mode");
      }

      const data = (await response.json()) as SystemSettingsResponse;
      setSettings(data);
      setFormData({});
      setSuccess(
        `✅ Maintenance mode ${enabled ? "enabled" : "disabled"} successfully!`
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle maintenance mode"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleFeatureFlag = async (flagName: string, enabled: boolean) => {
    setSaveLoading(true);
    try {
      const response = await fetch(
        `/api/admin/settings/feature-flags/${flagName}/${enabled}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to toggle feature flag: ${flagName}`);
      }

      const data = (await response.json()) as SystemSettingsResponse;
      setSettings(data);
      setFormData({});
      setSuccess(`✅ Feature flag '${flagName}' toggled successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle feature flag");
    } finally {
      setSaveLoading(false);
    }
  };

  const resetToDefaults = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setSaveLoading(true);
    try {
      const response = await fetch("/api/admin/settings/reset-to-defaults", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to reset settings");
      }

      const data = (await response.json()) as SystemSettingsResponse;
      setSettings(data);
      setFormData({});
      setValidation(null);
      setError(null);
      setShowResetConfirm(false);
      setSuccess("✅ Settings reset to defaults successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset settings");
      setShowResetConfirm(false);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || "Failed to load settings"}</div>
      </div>
    );
  }

  const featureFlagNames: Record<string, string> = {
    user_registration: "User Registration",
    portfolio_management: "Portfolio Management",
    social_features: "Social Features",
    ai_features: "AI Features",
    advanced_analytics: "Advanced Analytics",
    api_access: "API Access",
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>System Settings</h1>
        <div className={styles.status}>
          Last updated:{" "}
          {new Date(settings.updated_at).toLocaleString()}
        </div>
      </div>

      {/* Messages */}
      {success && <div className={styles.success}>{success}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Site Information Section */}
      <div className={styles.section}>
        <h2>Site Information</h2>
        <div className={styles.formGroup}>
          <label htmlFor="site_name">Site Name</label>
          <input
            id="site_name"
            type="text"
            name="site_name"
            placeholder="Site Name"
            defaultValue={settings.site_name}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="site_description">Site Description</label>
          <textarea
            id="site_description"
            name="site_description"
            placeholder="Site Description"
            defaultValue={settings.site_description}
            onChange={handleChange}
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="site_domain">Site Domain</label>
          <input
            id="site_domain"
            type="text"
            name="site_domain"
            placeholder="example.com"
            defaultValue={settings.site_domain}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="site_logo_url">Site Logo URL</label>
          <input
            id="site_logo_url"
            type="text"
            name="site_logo_url"
            placeholder="https://example.com/logo.png"
            defaultValue={settings.site_logo_url || ""}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Email Configuration Section */}
      <div className={styles.section}>
        <h2>Email Configuration</h2>
        <div className={styles.formGroup}>
          <label htmlFor="email_from_address">From Address</label>
          <input
            id="email_from_address"
            type="email"
            name="email_from_address"
            placeholder="noreply@example.com"
            defaultValue={settings.email_from_address}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email_from_name">From Name</label>
          <input
            id="email_from_name"
            type="text"
            name="email_from_name"
            placeholder="Lokifi"
            defaultValue={settings.email_from_name}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email_smtp_host">SMTP Host</label>
          <input
            id="email_smtp_host"
            type="text"
            name="email_smtp_host"
            placeholder="smtp.gmail.com"
            defaultValue={settings.email_smtp_host || ""}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email_smtp_port">SMTP Port</label>
          <input
            id="email_smtp_port"
            type="number"
            name="email_smtp_port"
            placeholder="587"
            defaultValue={settings.email_smtp_port || ""}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email_smtp_username">SMTP Username</label>
          <input
            id="email_smtp_username"
            type="text"
            name="email_smtp_username"
            placeholder="your-email@gmail.com"
            defaultValue={settings.email_smtp_username || ""}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Maintenance Mode Section */}
      <div className={styles.section}>
        <h2>Maintenance Mode</h2>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="maintenance_mode"
              checked={settings.maintenance_mode}
              onChange={() =>
                toggleMaintenanceMode(!settings.maintenance_mode)
              }
              disabled={saveLoading}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>Enable Maintenance Mode</span>
          </label>
        </div>

        {settings.maintenance_mode && (
          <div className={styles.formGroup}>
            <label htmlFor="maintenance_message">Maintenance Message</label>
            <textarea
              id="maintenance_message"
              name="maintenance_message"
              placeholder="System maintenance in progress..."
              defaultValue={settings.maintenance_message || ""}
              onChange={handleChange}
              className={styles.textarea}
              rows={2}
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="maintenance_allowed_ips">Allowed IPs (comma-separated)</label>
          <input
            id="maintenance_allowed_ips"
            type="text"
            name="maintenance_allowed_ips"
            placeholder="192.168.1.1, 10.0.0.0/8"
            defaultValue={settings.maintenance_allowed_ips}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Rate Limiting Section */}
      <div className={styles.section}>
        <h2>Rate Limiting</h2>
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="rate_limit_enabled"
              defaultChecked={settings.rate_limit_enabled}
              onChange={handleChange}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>Enable Rate Limiting</span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rate_limit_requests">Requests per Window</label>
          <input
            id="rate_limit_requests"
            type="number"
            name="rate_limit_requests"
            placeholder="100"
            defaultValue={settings.rate_limit_requests}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="rate_limit_window">Window Duration (seconds)</label>
          <input
            id="rate_limit_window"
            type="number"
            name="rate_limit_window"
            placeholder="3600"
            defaultValue={settings.rate_limit_window}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Security Settings Section */}
      <div className={styles.section}>
        <h2>Security Settings</h2>
        <div className={styles.formGroup}>
          <label htmlFor="session_timeout_minutes">Session Timeout (minutes)</label>
          <input
            id="session_timeout_minutes"
            type="number"
            name="session_timeout_minutes"
            placeholder="30"
            defaultValue={settings.session_timeout_minutes}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="require_email_verification"
              defaultChecked={settings.require_email_verification}
              onChange={handleChange}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              Require Email Verification
            </span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password_min_length">Minimum Password Length</label>
          <input
            id="password_min_length"
            type="number"
            name="password_min_length"
            placeholder="8"
            defaultValue={settings.password_min_length}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="max_login_attempts">Max Login Attempts</label>
          <input
            id="max_login_attempts"
            type="number"
            name="max_login_attempts"
            placeholder="5"
            defaultValue={settings.max_login_attempts}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="lockout_duration_minutes">
            Lockout Duration (minutes)
          </label>
          <input
            id="lockout_duration_minutes"
            type="number"
            name="lockout_duration_minutes"
            placeholder="15"
            defaultValue={settings.lockout_duration_minutes}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* API Settings Section */}
      <div className={styles.section}>
        <h2>API Settings</h2>
        <div className={styles.formGroup}>
          <label htmlFor="api_key_expiration_days">API Key Expiration (days)</label>
          <input
            id="api_key_expiration_days"
            type="number"
            name="api_key_expiration_days"
            placeholder="365"
            defaultValue={settings.api_key_expiration_days}
            onChange={handleChange}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cors_allowed_origins">CORS Allowed Origins (comma-separated)</label>
          <input
            id="cors_allowed_origins"
            type="text"
            name="cors_allowed_origins"
            placeholder="* or https://example.com"
            defaultValue={settings.cors_allowed_origins}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>

      {/* Feature Flags Section */}
      <div className={styles.section}>
        <h2>Feature Flags</h2>
        <div className={styles.flagsGrid}>
          {Object.entries(settings.feature_flags).map(([flag, enabled]) => (
            <div key={flag} className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() =>
                    toggleFeatureFlag(flag, !enabled)
                  }
                  disabled={saveLoading}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>
                  {featureFlagNames[flag] || flag}
                </span>
              </label>
              <span className={styles.flagStatus}>
                {enabled ? "✅ Enabled" : "⭕ Disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className={styles.section}>
          <h2>Validation Results</h2>
          {validation.is_valid ? (
            <div className={styles.success}>✅ All settings are valid!</div>
          ) : (
            <>
              {Object.keys(validation.errors).length > 0 && (
                <div className={styles.validationErrors}>
                  <h3>Errors</h3>
                  {Object.entries(validation.errors).map(([field, message]) => (
                    <div key={field} className={styles.errorItem}>
                      <strong>{field}:</strong> {message}
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(validation.warnings).length > 0 && (
                <div className={styles.validationWarnings}>
                  <h3>Warnings</h3>
                  {Object.entries(validation.warnings).map(([field, message]) => (
                    <div key={field} className={styles.warningItem}>
                      <strong>{field}:</strong> {message}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          onClick={validateSettings}
          disabled={loading || saveLoading || Object.keys(formData).length === 0}
          className={`${styles.btn} ${styles.secondary}`}
        >
          {loading ? "Validating..." : "Validate Changes"}
        </button>

        <button
          onClick={saveSettings}
          disabled={saveLoading || Object.keys(formData).length === 0}
          className={`${styles.btn} ${styles.primary}`}
        >
          {saveLoading ? "Saving..." : "Save Changes"}
        </button>

        <button
          onClick={resetToDefaults}
          disabled={saveLoading}
          className={`${styles.btn} ${styles.danger}`}
        >
          {showResetConfirm ? "Confirm Reset" : "Reset to Defaults"}
        </button>

        {showResetConfirm && (
          <button
            onClick={() => setShowResetConfirm(false)}
            disabled={saveLoading}
            className={`${styles.btn} ${styles.secondary}`}
          >
            Cancel Reset
          </button>
        )}
      </div>

      {showResetConfirm && (
        <div className={styles.resetWarning}>
          ⚠️ Warning: This action cannot be undone. All settings will be reset
          to their default values.
        </div>
      )}
    </div>
  );
}
