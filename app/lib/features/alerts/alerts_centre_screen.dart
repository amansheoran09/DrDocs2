import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../data/repositories.dart';
import '../../l10n/l10n.dart';
import '../../models/alert.dart';
import '../../widgets/alert_card.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_state.dart';

/// AL-01 Alerts Centre — all active alerts with severity filter tabs (3.5).
class AlertsCentreScreen extends ConsumerStatefulWidget {
  const AlertsCentreScreen({super.key});

  @override
  ConsumerState<AlertsCentreScreen> createState() => _AlertsCentreScreenState();
}

class _AlertsCentreScreenState extends ConsumerState<AlertsCentreScreen> {
  AlertSeverity? _filter; // null == All

  static const _tabs = <(String, AlertSeverity?)>[
    ('All', null),
    ('Critical', AlertSeverity.critical),
    ('Urgent', AlertSeverity.urgent),
    ('Upcoming', AlertSeverity.warning),
    ('Info', AlertSeverity.info),
  ];

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.t('alerts'))),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _tabs.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final tab = _tabs[i];
                return Center(
                  child: ChoiceChip(
                    label: Text(tab.$1),
                    selected: _filter == tab.$2,
                    onSelected: (_) => setState(() => _filter = tab.$2),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: alerts.when(
              loading: () => const LoadingState(),
              error: (e, __) => Center(child: Text('Error: $e')),
              data: (list) {
                final filtered = _filter == null
                    ? list
                    : list.where((a) => a.severity == _filter).toList();
                if (filtered.isEmpty) {
                  return EmptyState(
                    icon: Icons.notifications_off_outlined,
                    title: l.t('no_alerts'),
                    message: 'No alerts in this category right now.',
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final a = filtered[i];
                    return AlertCard(
                      alert: a,
                      onFix: a.relatedServiceId != null
                          ? () =>
                              context.go(Routes.serviceDetail(a.relatedServiceId!))
                          : null,
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
