import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../l10n/l10n.dart';

/// OB-02 Language Select — choose English / Hindi before anything else.
/// Choice is persisted to local storage (Section 3.1).
class LanguageSelectScreen extends ConsumerWidget {
  const LanguageSelectScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Text(l.t('choose_language'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 32),
              _LanguageButton(
                flag: '🇬🇧',
                label: 'English',
                onTap: () => _select(ref, context, 'en'),
              ),
              const SizedBox(height: 16),
              _LanguageButton(
                flag: '🇮🇳',
                label: 'हिन्दी',
                onTap: () => _select(ref, context, 'hi'),
              ),
              const Spacer(flex: 2),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _select(WidgetRef ref, BuildContext context, String code) async {
    await ref.read(localeProvider.notifier).setLocale(code);
    if (context.mounted) context.go(Routes.welcome);
  }
}

class _LanguageButton extends StatelessWidget {
  const _LanguageButton(
      {required this.flag, required this.label, required this.onTap});
  final String flag;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(64),
        side: const BorderSide(color: DvColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(flag, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 16),
          Text(label,
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: DvColors.textPrimary)),
        ],
      ),
    );
  }
}
