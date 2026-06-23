// _shared/onesignal.ts
// Thin wrapper over the OneSignal REST API (Section 5.4). Keys live only in
// Supabase Edge Function env vars — never in the client (Section 10, P0).

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!;
const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

export interface PushOptions {
  externalUserId: string; // DocVault user_id, set as OneSignal external_id
  title: string;
  body: string;
  deepLink?: string; // e.g. "AL-02" — opened by the app router
  data?: Record<string, unknown>;
}

/** Send a single targeted push notification. Returns the OneSignal id. */
export async function sendPush(opts: PushOptions): Promise<string> {
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Basic ${ONESIGNAL_REST_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [opts.externalUserId] },
      target_channel: "push",
      headings: { en: opts.title },
      contents: { en: opts.body },
      data: { deep_link: opts.deepLink ?? null, ...(opts.data ?? {}) },
    }),
  });

  if (!res.ok) {
    throw new Error(`OneSignal send failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.id as string;
}
