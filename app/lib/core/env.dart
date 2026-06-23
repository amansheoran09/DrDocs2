/// Compile-time configuration. Supply via --dart-define so secrets never live
/// in source control (Section 10, P0 "API keys never in client code").
///
/// Note: the Supabase anon key is safe to ship in the client — it only grants
/// access through RLS. Service-role keys, Razorpay/Vision/OneSignal secrets
/// live exclusively in Supabase Edge Function env vars and are NEVER bundled
/// in the app.
///
/// Example:
///   flutter run \
///     --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///     --dart-define=SUPABASE_ANON_KEY=eyJ...
abstract final class Env {
  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  static const String oneSignalAppId =
      String.fromEnvironment('ONESIGNAL_APP_ID', defaultValue: '');

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
