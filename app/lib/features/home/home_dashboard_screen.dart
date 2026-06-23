import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../l10n/l10n.dart';
import '../../widgets/alert_card.dart';
import '../../widgets/health_score_ring.dart';
import '../../widgets/loading_state.dart';

/// HM-01 Home Dashboard — health score ring, alert strip, quick actions and a
/// recent-activity feed (Section 3.2). All data fetched on load (Section 3.2).
class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final user = ref.watch(currentUserProvider);
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.t('app_name')),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => context.push(Routes.alerts),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(currentUserProvider);
          ref.invalidate(alertsProvider);
          await ref.read(currentUserProvider.future);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // (1) Document Health Score ring.
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: user.when(
                    loading: () => const SizedBox(
                        height: 160,
                        child: Center(child: CircularProgressIndicator())),
                    error: (_, __) => const Text('Could not load score'),
                    data: (u) => Column(
                      children: [
                        if (u != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Text('Hi ${u.firstName} 👋',
                                style: Theme.of(context).textTheme.titleMedium),
                          ),
                        InkWell(
                          borderRadius: BorderRadius.circular(100),
                          onTap: () => context.push(Routes.healthScore),
                          child: HealthScoreRing(score: u?.docHealthScore ?? 0),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // (3) Quick Action buttons.
            Row(
              children: [
                _QuickAction(
                    icon: Icons.document_scanner,
                    label: l.t('quick_scan'),
                    onTap: () => context.go(Routes.addDocument)),
                _QuickAction(
                    icon: Icons.home_repair_service,
                    label: l.t('quick_book'),
                    onTap: () => context.go(Routes.services)),
                _QuickAction(
                    icon: Icons.folder_open,
                    label: l.t('quick_view'),
                    onTap: () => context.go(Routes.documents)),
              ],
            ),
            const SizedBox(height: 24),

            // (2) Alert strip.
            Text(l.t('alerts'),
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            alerts.when(
              loading: () => const LoadingState(lines: 2),
              error: (_, __) => const Text('Could not load alerts'),
              data: (list) {
                if (list.isEmpty) {
                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.check_circle, color: DvColors.success),
                      title: Text(l.t('no_alerts')),
                    ),
                  );
                }
                return Column(
                  children: list
                      .take(3)
                      .map((a) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: AlertCard(
                              alert: a,
                              onTap: () => context.push(Routes.alertDetail(a.alertId)),
                              onFix: a.relatedServiceId != null
                                  ? () => context.go(
                                      Routes.serviceDetail(a.relatedServiceId!))
                                  : null,
                            ),
                          ))
                      .toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction(
      {required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: DvColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: DvColors.border),
            ),
            child: Column(
              children: [
                Icon(icon, color: DvColors.primary),
                const SizedBox(height: 8),
                Text(label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
