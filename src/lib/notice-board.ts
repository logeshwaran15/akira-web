// Shared by the admin page (/comm-notice-board) and the dashboard banner strips.
import { API_BASE_URL } from "@/lib/api";

export type NoticeRow = {
  akiraNoticeBoardKey: string;
  title: string;
  fileUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type NoticeStatus = "Active" | "Scheduled" | "Expired" | "Inactive";

/** The API may return a relative path; make it loadable from the web app. */
export const noticeFileSrc = (url: string | null) =>
  !url ? null : /^(https?:|data:|blob:)/i.test(url) ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Dates are compared as yyyy-MM-dd strings so time zones can't shift the day. */
export function noticeStatus(n: Pick<NoticeRow, "isActive" | "startDate" | "endDate">): NoticeStatus {
  if (!n.isActive) return "Inactive";
  const now = today();
  const start = n.startDate?.slice(0, 10);
  const end = n.endDate?.slice(0, 10);
  if (start && start > now) return "Scheduled";
  if (end && end < now) return "Expired";
  return "Active";
}
