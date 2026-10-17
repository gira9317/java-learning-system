import { request } from "./client";

export type ReviewNotification = {
  id: string;
  lesson_id: number;
  lesson_number: number;
  lesson_title: string;
  question_no: number;
  kind: "flow" | "code";
  status: "approved" | "rejected";
  review_comment: string | null;
  reviewed_at: string;
  review_read_at: string | null;
};
export type NotificationFeed = { unread_count: number; review_version: string; notifications: ReviewNotification[] };

export function getNotifications() {
  return request<NotificationFeed>("/notifications");
}

export function readNotification(id: string) {
  return request<{ notification: { id: string; review_read_at: string } }>(`/notifications/${id}/read`, { method: "POST", body: {}, keepalive: true });
}
