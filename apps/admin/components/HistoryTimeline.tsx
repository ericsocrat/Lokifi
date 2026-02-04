"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import s from "./HistoryTimeline.module.css";

interface HistoryEntry {
  id: string;
  timestamp: string;
  event_type: string;
  moderator_id?: string;
  moderator_name?: string;
  action?: string;
  notes?: string;
  suspension_days?: number;
  appeal_status?: string;
}

interface HistoryTimelineProps {
  flagId: string;
}

const EVENT_CONFIG = {
  flag_created: {
    icon: "🚩",
    label: "Content Flagged",
    color: "#3b82f6", // blue
  },
  decision_made: {
    icon: "⚖️",
    label: "Moderation Decision",
    color: "#10b981", // green
  },
  appeal_submitted: {
    icon: "📝",
    label: "Appeal Submitted",
    color: "#f59e0b", // amber
  },
  appeal_reviewed: {
    icon: "✅",
    label: "Appeal Reviewed",
    color: "#8b5cf6", // purple
  },
};

const ACTION_LABELS = {
  dismiss: "Dismissed",
  approve_remove: "Content Removed",
  suspend_temporary: "Temporary Suspension",
  suspend_permanent: "Permanent Ban",
};

const APPEAL_STATUS_LABELS = {
  pending: "Pending Review",
  approved: "Appeal Approved",
  denied: "Appeal Denied",
};

export default function HistoryTimeline({ flagId }: HistoryTimelineProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["moderationHistory", flagId],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`http://localhost:8000/admin/moderation/flags/${flagId}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
  });

  const toggleNotes = (entryId: string) => {
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className={s.container}>
        <h2 className={s.title}>Moderation History</h2>
        <div className={s.loading}>Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.container}>
        <h2 className={s.title}>Moderation History</h2>
        <div className={s.error}>Failed to load history timeline</div>
      </div>
    );
  }

  const entries: HistoryEntry[] = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className={s.container}>
        <h2 className={s.title}>Moderation History</h2>
        <div className={s.empty}>No history entries found</div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <h2 className={s.title}>
        Moderation History
        <span className={s.count}>{entries.length} events</span>
      </h2>

      <div className={s.timeline}>
        {entries.map((entry, index) => {
          const config = EVENT_CONFIG[entry.event_type as keyof typeof EVENT_CONFIG] || {
            icon: "📌",
            label: entry.event_type,
            color: "#6b7280",
          };
          const isExpanded = expandedNotes.has(entry.id);
          const hasLongNotes = (entry.notes?.length || 0) > 150;

          return (
            <div key={`${entry.id}-${index}`} className={s.entry}>
              <div className={s.entryLine} style={{ background: config.color }} />

              <div className={s.entryIcon} style={{ background: config.color }}>
                {config.icon}
              </div>

              <div className={s.entryContent}>
                <div className={s.entryHeader}>
                  <span className={s.entryLabel}>{config.label}</span>
                  <span className={s.entryTime}>
                    {new Date(entry.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {entry.moderator_name && (
                  <div className={s.entryModerator}>
                    By: <strong>{entry.moderator_name}</strong>
                  </div>
                )}

                {entry.action && (
                  <div className={s.entryAction}>
                    Action:{" "}
                    <span className={s.actionBadge}>{ACTION_LABELS[entry.action as keyof typeof ACTION_LABELS]}</span>
                  </div>
                )}

                {entry.suspension_days && (
                  <div className={s.entrySuspension}>
                    Suspension: <strong>{entry.suspension_days} days</strong>
                  </div>
                )}

                {entry.appeal_status && (
                  <div className={s.entryAppeal}>
                    Status:{" "}
                    <span className={s.appealBadge}>
                      {APPEAL_STATUS_LABELS[entry.appeal_status as keyof typeof APPEAL_STATUS_LABELS]}
                    </span>
                  </div>
                )}

                {entry.notes && (
                  <div className={s.entryNotes}>
                    <div className={s.notesLabel}>Notes:</div>
                    <div className={isExpanded ? s.notesExpanded : s.notesTruncated}>{entry.notes}</div>
                    {hasLongNotes && (
                      <button className={s.notesToggle} onClick={() => toggleNotes(entry.id)}>
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
