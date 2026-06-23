import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../l10n/l10n.dart';

/// OB-01 Splash — brand moment + auth state check (Section 3.1).
/// Active session -> Home; first run -> Language; else -> Phone.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _decideNext();
  }

  Future<void> _decideNext() async {
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      context.go(Routes.home);
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    final seenLanguage = prefs.getString('app_language') != null;
    if (!mounted) return;
    context.go(seenLanguage ? Routes.phone : Routes.language);
  }

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    return Scaffold(
      backgroundColor: DvColors.primary,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shield_moon, size: 88, color: Colors.white),
            const SizedBox(height: 16),
            Text(l.t('app_name'),
                style: const TextStyle(
                    color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('by Dr.Docs',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
            const SizedBox(height: 32),
            const SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(
                  strokeWidth: 2.5, color: Colors.white54),
            ),
          ],
        ),
      ),
    );
  }
}
