import { NextResponse } from "next/server";
import { db } from "@/app/api/lib/firebaseAdmin";

export async function GET() {
  try {
    const statsDoc = await db.collection("stats").doc("loginStats").get();

    if (!statsDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Stats document does not exist." },
        { status: 500 }
      );
    }

    const data = statsDoc.data()!;

    return NextResponse.json({
      success: true,
      // -- Headline numbers
      totalLogins:              data.total_successful_logins   ?? 0,
      failedLogins:             data.failed_logins             ?? 0,
      uniqueLogins:             data.unique_logins             ?? 0,
      totalApiCalls:            data.total_api_calls           ?? 0,
      // -- Messaging
      totalMessagesSent:        data.total_messages_sent       ?? 0,
      totalConversations:       data.total_conversations_created ?? 0,
      totalReactions:           data.total_reactions_added     ?? 0,
      messageHours:             data.message_hours             ?? {},
      // -- Feature usage
      totalAiMessages:          data.total_ai_messages         ?? 0,
      totalNotesCreated:        data.total_notes_created       ?? 0,
      totalScheduleViews:       data.total_schedule_views      ?? 0,
      totalAssignmentFetches:   data.total_assignment_fetches  ?? 0,
      totalLunchFetches:        data.total_lunch_fetches       ?? 0,
      totalNewsFetches:         data.total_news_fetches        ?? 0,
      // -- Histograms (objects keyed by hour/day/school/date)
      loginHours:               data.login_hours  ?? {},
      loginDays:                data.login_days   ?? {},
      aiHours:                  data.ai_hours     ?? {},
      schools:                  data.schools      ?? {},
      peakDates:                data.peak_dates   ?? {},
    });
  } catch (error) {
    console.error("[stats] Error:", (error as Error).message);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats." },
      { status: 500 }
    );
  }
}
