import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../data/repositories.dart';
import '../../l10n/l10n.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_state.dart';
import '../../widgets/service_card.dart';

/// SV-01 Services Home — browse the Dr.Docs catalogue (Section 3.6).
class ServicesHomeScreen extends ConsumerWidget {
  const ServicesHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final services = ref.watch(servicesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.t('services'))),
      body: services.when(
        loading: () => const LoadingState(),
        error: (e, __) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.handyman_outlined,
              title: 'No services yet',
              message: 'The Dr.Docs catalogue is being set up. Check back soon.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => ServiceCard(
              service: list[i],
              onBook: () => context.go(Routes.serviceDetail(list[i].serviceId)),
            ),
          );
        },
      ),
    );
  }
}
