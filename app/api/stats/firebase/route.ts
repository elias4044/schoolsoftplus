// app/api/firebase/route.ts
export const runtime = "nodejs";

import { db } from "../../lib/firebaseAdmin";

// This route reads a simple status document from Firestore instead of
// querying the Google Cloud Monitoring API. The document is expected at
// `service_status/firestore` and can contain fields like `operational`,
// `today`, `month`, `limits`, `exceeded` and an optional `errorCode`.

export async function GET() {
  try {
    const ref = db.doc("service_status/firestore");
    const snap = await ref.get();

    if (!snap.exists) {
      return new Response(JSON.stringify({
        operational: false,
        error: "NOT_FOUND",
        message: "Service status document not found.",
      }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    const data = snap.data() || {};

    // Normalize response shape to match previous API consumer expectations.
    const operational = data.operational !== undefined ? Boolean(data.operational) : true;
    const today = data.today || { reads: 0, writes: 0, deletes: 0 };
    const month = data.month || { reads: 0, writes: 0, deletes: 0 };
    const limits = data.limits || null;
    const exceeded = Array.isArray(data.exceeded) ? data.exceeded : [];

    // If Firestore has recorded a RESOURCE_EXHAUSTED event, surface it.
    if (data.errorCode === "RESOURCE_EXHAUSTED" || data.error === "RESOURCE_EXHAUSTED") {
      return Response.json({ operational: false, errorCode: "RESOURCE_EXHAUSTED", today, month, limits, exceeded });
    }

    if (!operational) {
      return Response.json({ operational: false, error: data.error ?? "SERVICE_DOWN", today, month, limits, exceeded });
    }

    return Response.json({ operational: true, today, month, limits, exceeded });
  } catch (err: any) {
    // Network / read failures should be treated as service down so the
    // frontend can show an outage message.
    const code = err?.code || "FAILED_TO_FETCH";
    return new Response(JSON.stringify({ operational: false, error: code, message: String(err?.message ?? err) }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}