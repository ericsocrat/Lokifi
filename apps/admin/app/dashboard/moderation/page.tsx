"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import s from "./moderation.module.css";

interface FlaggedContent {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  created_at: string;
  description: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

interface FlagListResponse {
  items: FlaggedContent[];
  total: number;
  page: number;
  page_size: number;
}

interface Statistics {
  total_flags: number;
  pending_flags: number;
  under_review_flags: number;
  resolved_flags: number;
  dismissed_flags: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function fetchFlags(
  page: number,
  status?: string,
  contentType?: string,
  reason?: string,
): Promise<FlagListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: "20",
  });

  if (status) params.append("status", status);
  if (contentType) params.append("content_type", contentType);
  if (reason) params.append("reason", reason);

  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/admin/moderation/flags?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch flags: ${response.status}`);
  }

  return response.json();
}

async function fetchStatistics(): Promise<Statistics> {
  const token = localStorage.getItem("auth_token");
  const response = await fetch(`${API_BASE_URL}/admin/moderation/statistics`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch statistics: ${response.status}`);
  }

  return response.json();
}

export default function ModerationPage() {
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedContentType, setSelectedContentType] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");

  // Fetch flags
  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ["flags", page, selectedStatus, selectedContentType, selectedReason],
    queryFn: () =>
      fetchFlags(page, selectedStatus || undefined, selectedContentType || undefined, selectedReason || undefined),
    staleTime: 30000,
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: fetchStatistics,
    staleTime: 60000,
  });

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setPage(1);
  };

  const handleContentTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedContentType(e.target.value);
    setPage(1);
  };

  const handleReasonFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReason(e.target.value);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "pending":
        return s.badgePending;
      case "under_review":
        return s.badgeReview;
      case "resolved":
        return s.badgeResolved;
      case "dismissed":
        return s.badgeDismissed;
      case "appealed":
        return s.badgeAppealed;
      default:
        return s.badgeDefault;
    }
  };

  const getContentTypeIcon = (contentType: string): string => {
    switch (contentType) {
      case "post":
        return "📝";
      case "comment":
        return "💬";
      case "profile":
        return "👤";
      case "message":
        return "✉️";
      case "conversation":
        return "🗨️";
      default:
        return "📄";
    }
  };

  const getReason = (reason: string): string => {
    return reason
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={s.container}>
      {/* Page Header */}
      <div className={s.header}>
        <h1>Content Moderation</h1>
        <p>Review and manage flagged content</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className={s.statsGrid}>
          <div className={s.statCard}>
            <div className={s.statValue}>{stats.total_flags}</div>
            <div className={s.statLabel}>Total Flags</div>
          </div>
          <div className={s.statCard + " " + s.statCardPending}>
            <div className={s.statValue}>{stats.pending_flags}</div>
            <div className={s.statLabel}>Pending</div>
          </div>
          <div className={s.statCard + " " + s.statCardReview}>
            <div className={s.statValue}>{stats.under_review_flags}</div>
            <div className={s.statLabel}>Under Review</div>
          </div>
          <div className={s.statCard + " " + s.statCardResolved}>
            <div className={s.statValue}>{stats.resolved_flags}</div>
            <div className={s.statLabel}>Resolved</div>
          </div>
          <div className={s.statCard + " " + s.statCardDismissed}>
            <div className={s.statValue}>{stats.dismissed_flags}</div>
            <div className={s.statLabel}>Dismissed</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={s.filters}>
        <select value={selectedStatus} onChange={handleStatusFilter} className={s.select}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="appealed">Appealed</option>
        </select>

        <select value={selectedContentType} onChange={handleContentTypeFilter} className={s.select}>
          <option value="">All Content Types</option>
          <option value="post">Post</option>
          <option value="comment">Comment</option>
          <option value="profile">Profile</option>
          <option value="message">Message</option>
          <option value="conversation">Conversation</option>
          <option value="other">Other</option>
        </select>

        <select value={selectedReason} onChange={handleReasonFilter} className={s.select}>
          <option value="">All Reasons</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate Speech</option>
          <option value="violence">Violence</option>
          <option value="sexual_content">Sexual Content</option>
          <option value="misleading">Misleading</option>
          <option value="scam">Scam</option>
          <option value="intellectual_property">Intellectual Property</option>
          <option value="self_harm">Self Harm</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Flags Table */}
      <div className={s.tableContainer}>
        {flagsLoading ? (
          <div className={s.loading}>Loading flags...</div>
        ) : flagsData?.items?.length === 0 ? (
          <div className={s.empty}>No flagged content found</div>
        ) : (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Reason</th>
                  <th>Reporter ID</th>
                  <th>Status</th>
                  <th>Reported</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {flagsData?.items?.map((flag) => (
                  <tr key={flag.id}>
                    <td>
                      <div className={s.contentCell}>
                        <span className={s.contentIcon}>{getContentTypeIcon(flag.content_type)}</span>
                        <div className={s.contentInfo}>
                          <div className={s.contentType}>{flag.content_type}</div>
                          <div className={s.contentId}>{flag.content_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={s.reason}>{getReason(flag.reason)}</div>
                    </td>
                    <td>
                      <code className={s.code}>{flag.reporter_id}</code>
                    </td>
                    <td>
                      <span className={`${s.badge} ${getStatusBadgeClass(flag.status)}`}>
                        {flag.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td>{formatDate(flag.created_at)}</td>
                    <td>
                      <Link href={`/dashboard/moderation/${flag.id}`} className={s.reviewButton}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {flagsData && (
              <div className={s.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={s.paginationButton}
                >
                  Previous
                </button>

                <span className={s.paginationInfo}>
                  Page {page} of {Math.ceil((flagsData.total || 0) / (flagsData.page_size || 20))}
                </span>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil((flagsData.total || 0) / (flagsData.page_size || 20))}
                  className={s.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
