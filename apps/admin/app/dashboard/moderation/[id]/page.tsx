"use client";

import HistoryTimeline from "@/components/HistoryTimeline";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import s from "./detail.module.css";

interface FlagDetail {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  target_user_id?: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  moderation_notes?: string;
}

interface ModerationDecision {
  id: string;
  flagged_content_id: string;
  decided_by: string;
  action: string;
  reasoning: string;
  suspension_days?: number;
  is_appealable: boolean;
  created_at: string;
}

interface FormData {
  action: string;
  reasoning: string;
  suspension_days?: number;
  is_appealable: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchFlagDetail(flagId: string): Promise<FlagDetail> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/admin/moderation/flags/${flagId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch flag: ${response.status}`);
  }

  return response.json();
}

async function createModerationDecision(
  flagId: string,
  decision: {
    action: string;
    reasoning: string;
    suspension_days?: number;
    is_appealable: boolean;
  },
): Promise<ModerationDecision> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/admin/moderation/flags/${flagId}/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(decision),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to create decision: ${response.status}`);
  }

  return response.json();
}

export default function FlagDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const flagId = params.id;

  const [formData, setFormData] = useState<FormData>({
    action: "no_action",
    reasoning: "",
    is_appealable: true,
  });

  const [submitError, setSubmitError] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  // Fetch flag detail
  const {
    data: flag,
    isLoading: flagLoading,
    error: flagError,
  } = useQuery({
    queryKey: ["flag", flagId],
    queryFn: () => fetchFlagDetail(flagId),
  });

  // Mutation for creating decision
  const createDecisionMutation = useMutation({
    mutationFn: () => createModerationDecision(flagId, formData),
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        router.push("/dashboard/moderation");
      }, 2000);
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!formData.reasoning.trim()) {
      setSubmitError("Please provide reasoning for your decision");
      return;
    }

    if (formData.action === "suspend_temporary" && !formData.suspension_days) {
      setSubmitError("Please specify number of suspension days");
      return;
    }

    createDecisionMutation.mutate();
  };

  if (flagLoading) {
    return <div className={s.loading}>Loading flag details...</div>;
  }

  if (flagError || !flag) {
    return <div className={s.error}>Failed to load flag details</div>;
  }

  return (
    <div className={s.container}>
      {/* Back Link */}
      <Link href="/dashboard/moderation" className={s.backLink}>
        ← Back to Moderation
      </Link>

      {/* Success Message */}
      {submitted && <div className={s.successMessage}>✅ Decision submitted successfully. Redirecting...</div>}

      {/* Error Message */}
      {submitError && <div className={s.errorMessage}>{submitError}</div>}

      {/* Main Content */}
      <div className={s.content}>
        {/* Left Side: Flag Details */}
        <div className={s.leftPanel}>
          <div className={s.card}>
            <h2>Flagged Content</h2>

            <div className={s.detailGrid}>
              <div className={s.detailRow}>
                <label>Content Type</label>
                <span className={s.value}>{flag.content_type}</span>
              </div>

              <div className={s.detailRow}>
                <label>Content ID</label>
                <code className={s.code}>{flag.content_id}</code>
              </div>

              {flag.target_user_id && (
                <div className={s.detailRow}>
                  <label>Target User</label>
                  <code className={s.code}>{flag.target_user_id}</code>
                </div>
              )}

              <div className={s.detailRow}>
                <label>Reason</label>
                <span className={s.reason}>{flag.reason.replace("_", " ").toUpperCase()}</span>
              </div>

              <div className={s.detailRow}>
                <label>Description</label>
                <p className={s.description}>{flag.description}</p>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <h3>Reporter Information</h3>

            <div className={s.detailGrid}>
              <div className={s.detailRow}>
                <label>Reporter ID</label>
                <code className={s.code}>{flag.reporter_id}</code>
              </div>

              <div className={s.detailRow}>
                <label>Reported On</label>
                <span className={s.value}>
                  {new Date(flag.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          {flag.reviewed_by && (
            <div className={s.card}>
              <h3>Review History</h3>

              <div className={s.detailGrid}>
                <div className={s.detailRow}>
                  <label>Reviewed By</label>
                  <code className={s.code}>{flag.reviewed_by}</code>
                </div>

                <div className={s.detailRow}>
                  <label>Reviewed At</label>
                  <span className={s.value}>
                    {flag.reviewed_at
                      ? new Date(flag.reviewed_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Not reviewed"}
                  </span>
                </div>

                {flag.moderation_notes && (
                  <div className={s.detailRow}>
                    <label>Notes</label>
                    <p className={s.description}>{flag.moderation_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Decision Form */}
        <div className={s.rightPanel}>
          {flag.status !== "resolved" ? (
            <div className={s.card}>
              <h2>Take Moderation Action</h2>

              <form onSubmit={handleSubmit} className={s.form}>
                {/* Action Selection */}
                <div className={s.formGroup}>
                  <label htmlFor="action">Action</label>
                  <select
                    id="action"
                    value={formData.action}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        action: e.target.value,
                        suspension_days: undefined,
                      });
                    }}
                    className={s.select}
                  >
                    <option value="no_action">No Action</option>
                    <option value="warning">Warning</option>
                    <option value="hide_content">Hide Content</option>
                    <option value="remove_content">Remove Content</option>
                    <option value="suspend_temporary">Suspend (Temporary)</option>
                    <option value="suspend_permanent">Suspend (Permanent)</option>
                    <option value="ban">Ban User</option>
                  </select>
                </div>

                {/* Suspension Days */}
                {formData.action === "suspend_temporary" && (
                  <div className={s.formGroup}>
                    <label htmlFor="suspension_days">Suspension Days</label>
                    <input
                      id="suspension_days"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.suspension_days || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          suspension_days: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className={s.input}
                      placeholder="Days"
                    />
                  </div>
                )}

                {/* Reasoning */}
                <div className={s.formGroup}>
                  <label htmlFor="reasoning">Reasoning</label>
                  <textarea
                    id="reasoning"
                    value={formData.reasoning}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reasoning: e.target.value,
                      })
                    }
                    className={s.textarea}
                    placeholder="Explain your decision..."
                    rows={5}
                  />
                </div>

                {/* Appealable Checkbox */}
                <div className={s.formGroup + " " + s.checkboxGroup}>
                  <label htmlFor="appealable">
                    <input
                      id="appealable"
                      type="checkbox"
                      checked={formData.is_appealable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_appealable: e.target.checked,
                        })
                      }
                      className={s.checkbox}
                    />
                    Allow user to appeal this decision
                  </label>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={createDecisionMutation.isPending} className={s.submitButton}>
                  {createDecisionMutation.isPending ? "Submitting..." : "Submit Decision"}
                </button>
              </form>
            </div>
          ) : (
            <div className={s.card}>
              <h3>✅ Already Resolved</h3>
              <p>This flag has already been reviewed and resolved.</p>
            </div>
          )}
        </div>
      </div>

      {/* History Timeline Section */}
      <div className={s.historySection}>
        <HistoryTimeline flagId={flagId} />
      </div>
    </div>
  );
}
