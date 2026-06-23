import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../models/alert.dart';

/// AL-02 Alert Detail — plain-language explanation, consequences and the
/// "Fix with Dr.Docs" CTA that pre-fills a service booking (Section 3.5).
class AlertDetailScreen extends ConsumerWidget {
  const AlertDetailScreen({super.key, required this.alertId});
  final String alertId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alert = ref.watch(alertByIdProvider(alertId));
    return Scaffold(
      appBar: AppBar(title: const Text('Alert')),
      body: alert.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, __) => Center(child: Text('Error: $e')),
        data: (a) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: a.severity.color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(a.title,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(color: a.severity.color)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(a.message, style: const TextStyle(fontSize: 16, height: 1.5)),
            const SizedBox(height: 24),
            _InfoBlock(
              icon: Icons.report_problem_outlined,
              title: 'What happens if you ignore this',
              body: _consequence(a),
              color: DvColors.warning,
            ),
            const SizedBox(height: 12),
            _InfoBlock(
              icon: Icons.handshake_outlined,
              title: 'How Dr.Docs fixes this',
              body: 'A Dr.Docs agent collects your documents from home and '
                  'completes the process for you — you just need to be present.',
              color: DvColors.success,
            ),
          ],
        ),
      ),
      bottomNavigationBar: alert.maybeWhen(
        data: (a) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      await ref
                          .read(supabaseProvider)
                          .from('alerts')
                          .update({'is_dismissed': true}).eq('alert_id', a.alertId);
                      ref.invalidate(alertsProvider);
                      if (context.mounted) context.pop();
                    },
                    child: const Text('Dismiss'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: a.relatedServiceId != null
                        ? () => context.go(Routes.serviceDetail(a.relatedServiceId!))
                        : () => context.go(Routes.services),
                    child: const Text('Book Now'),
                  ),
                ),
              ],
            ),
          ),
        ),
        orElse: () => const SizedBox.shrink(),
      ),
    );
  }

  String _consequence(Alert a) => switch (a.alertType) {
        'expiry_overdue' =>
          'An expired document is not legally valid and can be rejected anywhere it is required.',
        'link_gap_pan_aadhaar' =>
          'An unlinked PAN can be deactivated and attracts a penalty of up to Rs.10,000.',
        'name_mismatch' =>
          'Name mismatches across documents cause rejections during verification.',
        _ =>
          'Leaving this unresolved can lead to last-minute stress, fines or service rejections.',
      };
}

class _InfoBlock extends StatelessWidget {
  const _InfoBlock(
      {required this.icon,
      required this.title,
      required this.body,
      required this.color});
  final IconData icon;
  final String title;
  final String body;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: color),
                const SizedBox(width: 8),
                Text(title,
                    style: TextStyle(fontWeight: FontWeight.w700, color: color)),
              ],
            ),
            const SizedBox(height: 8),
            Text(body, style: const TextStyle(height: 1.4)),
          ],
        ),
      );
}
