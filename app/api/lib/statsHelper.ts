/**
 * Fire-and-forget stats helpers.
 * All functions use FieldValue.increment / atomic updates so they never need
 * a full transaction and never block the HTTP response.
 */

import admin from "firebase-admin";
import { db } from "./firebaseAdmin";

const inc = admin.firestore.FieldValue.increment;
const STATS_REF = () => db.collection("stats").doc("loginStats");

/**
 * Bump a flat numeric counter (e.g. total_ai_messages).
 * Silently swallows errors so a stats failure never breaks the real request.
 */
export function bumpCounter(field: string, by = 1): void {
  STATS_REF()
    .update({ [field]: inc(by), total_api_calls: inc(1) })
    .catch(() => {});
}

/**
 * Bump a nested histogram bucket, e.g. login_hours.14 or schools.engelska.
 * Creates the field if it doesn't exist thanks to dot-notation + FieldValue.
 */
export function bumpHistogram(bucket: string, key: string | number): void {
  STATS_REF()
    .update({ [`${bucket}.${key}`]: inc(1) })
    .catch(() => {});
}

/**
 * Record a login event. Bumps:
 *  - login_hours.<0-23>      → when during the day people log in
 *  - login_days.<0-6>        → which day of the week (0 = Sunday)
 *  - schools.<slug>          → which schools are active
 *  - peak_date.<YYYY-MM-DD>  → busiest calendar days
 */
export function trackLoginEvent(school: string): void {
  const now = new Date();
  const hour = now.getUTCHours();          // 0-23
  const day  = now.getUTCDay();            // 0 (Sun) – 6 (Sat)
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD

  STATS_REF()
    .update({
      [`login_hours.${hour}`]: inc(1),
      [`login_days.${day}`]:   inc(1),
      [`schools.${school}`]:   inc(1),
      [`peak_dates.${date}`]:  inc(1),
    })
    .catch(() => {});
}

/**
 * Track an AI message. Bumps:
 *  - total_ai_messages
 *  - ai_messages_by_hour.<0-23>
 */
export function trackAiMessage(): void {
  const hour = new Date().getUTCHours();
  STATS_REF()
    .update({
      total_ai_messages:              inc(1),
      [`ai_hours.${hour}`]:           inc(1),
      total_api_calls:                inc(1),
    })
    .catch(() => {});
}

/**
 * Track a note creation.
 */
export function trackNoteCreated(): void {
  bumpCounter("total_notes_created");
}

/**
 * Track a schedule view.
 */
export function trackScheduleView(): void {
  bumpCounter("total_schedule_views");
}

/**
 * Track an assignments fetch.
 */
export function trackAssignmentsFetch(): void {
  bumpCounter("total_assignment_fetches");
}

/**
 * Track a lunch menu fetch.
 */
export function trackLunchFetch(): void {
  bumpCounter("total_lunch_fetches");
}

/**
 * Track a news fetch.
 */
export function trackNewsFetch(): void {
  bumpCounter("total_news_fetches");
}

/**
 * Track a message being sent.
 */
export function trackMessageSent(): void {
  const hour = new Date().getUTCHours();
  STATS_REF()
    .update({
      total_messages_sent:        inc(1),
      [`message_hours.${hour}`]:  inc(1),
      total_api_calls:            inc(1),
    })
    .catch(() => {});
}

/**
 * Track a new conversation being created.
 */
export function trackConversationCreated(): void {
  bumpCounter("total_conversations_created");
}

/**
 * Track a reaction being toggled.
 */
export function trackReactionAdded(): void {
  bumpCounter("total_reactions_added");
}
