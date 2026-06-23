import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/env.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (Env.isConfigured) {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
      // Phone OTP auth (Section 5.1); session persisted on device.
      authOptions: const FlutterAuthClientOptions(autoRefreshToken: true),
    );
  } else {
    // Allows `flutter run` without secrets (shows a config notice on splash).
    debugPrint('⚠️  SUPABASE_URL / SUPABASE_ANON_KEY not set — see app/lib/core/env.dart');
  }

  runApp(const ProviderScope(child: DocVaultApp()));
}
