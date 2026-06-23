import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/env.dart';
import 'core/router.dart';
import 'core/theme/dv_colors.dart';
import 'core/theme/dv_theme.dart';
import 'l10n/l10n.dart';

class DocVaultApp extends ConsumerStatefulWidget {
  const DocVaultApp({super.key});

  @override
  ConsumerState<DocVaultApp> createState() => _DocVaultAppState();
}

class _DocVaultAppState extends ConsumerState<DocVaultApp> {
  GoRouter? _router;

  @override
  void initState() {
    super.initState();
    if (Env.isConfigured) _router = buildRouter();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);

    if (!Env.isConfigured) {
      return const _ConfigNeededApp();
    }

    return MaterialApp.router(
      title: 'DocVault',
      debugShowCheckedModeBanner: false,
      theme: locale.languageCode == 'hi' ? DvTheme.hindi() : DvTheme.light(),
      locale: locale,
      supportedLocales: L10n.supportedLocales,
      localizationsDelegates: const [
        L10n.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: _router!,
    );
  }
}

/// Shown when SUPABASE_URL / SUPABASE_ANON_KEY are not provided via
/// --dart-define. Keeps the app runnable for design review without secrets.
class _ConfigNeededApp extends StatelessWidget {
  const _ConfigNeededApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DocVault',
      debugShowCheckedModeBanner: false,
      theme: DvTheme.light(),
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.shield_outlined, size: 56, color: DvColors.primary),
                const SizedBox(height: 16),
                Text('DocVault', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 12),
                const Text(
                  'Supabase is not configured.\nRun with:\n\n'
                  'flutter run \\\n'
                  '  --dart-define=SUPABASE_URL=... \\\n'
                  '  --dart-define=SUPABASE_ANON_KEY=...',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: DvColors.textSecondary, height: 1.5),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
