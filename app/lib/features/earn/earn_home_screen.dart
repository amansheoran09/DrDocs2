import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../l10n/l10n.dart';

/// ER-01 Earn Home — DocCash balance + earning streams (Section 3.7).
class EarnHomeScreen extends ConsumerWidget {
  const EarnHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.t('earn'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: DvColors.primary,
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const Text('DocCash Balance',
                      style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 8),
                  user.when(
                    loading: () => const CircularProgressIndicator(color: Colors.white),
                    error: (_, __) => const Text('—',
                        style: TextStyle(color: Colors.white, fontSize: 32)),
                    data: (u) => Text(
                      '₹${(u?.doccashRupees ?? 0).toStringAsFixed(0)}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 40,
                          fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _EarnStream(
            icon: Icons.group_add,
            title: 'Refer a Friend',
            reward: 'Earn ₹50 + ₹250',
            onTap: () => context.push('/earn/refer'),
          ),
          _EarnStream(
            icon: Icons.badge,
            title: 'Become an Agent',
            reward: 'Earn ₹200 on certification',
            onTap: () => context.push('/earn/agent'),
          ),
          _EarnStream(
            icon: Icons.star_rate,
            title: 'Write a Review',
            reward: 'Earn ₹100',
            onTap: () {},
          ),
          _EarnStream(
            icon: Icons.fact_check,
            title: 'Complete Your Profile',
            reward: 'Earn ₹150 (all 6 core docs)',
            onTap: () => context.go('/documents'),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => context.push('/earn/wallet'),
            icon: const Icon(Icons.account_balance_wallet_outlined),
            label: const Text('DocCash Wallet'),
          ),
        ],
      ),
    );
  }
}

class _EarnStream extends StatelessWidget {
  const _EarnStream(
      {required this.icon,
      required this.title,
      required this.reward,
      required this.onTap});
  final IconData icon;
  final String title;
  final String reward;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: DvColors.accent.withValues(alpha: 0.15),
              child: Icon(icon, color: DvColors.accent),
            ),
            title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(reward),
            trailing: const Icon(Icons.chevron_right),
            onTap: onTap,
          ),
        ),
      );
}
