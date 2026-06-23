import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../l10n/l10n.dart';

/// PR-01 Profile Home — account overview + settings menu (Section 3.8).
class ProfileHomeScreen extends ConsumerWidget {
  const ProfileHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = L10n.of(context);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.t('profile'))),
      body: ListView(
        children: [
          user.when(
            loading: () => const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator())),
            error: (_, __) => const SizedBox.shrink(),
            data: (u) => Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: DvColors.primary.withValues(alpha: 0.1),
                    backgroundImage:
                        u?.profilePhotoUrl != null ? NetworkImage(u!.profilePhotoUrl!) : null,
                    child: u?.profilePhotoUrl == null
                        ? const Icon(Icons.person, size: 32, color: DvColors.primary)
                        : null,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(u?.fullName ?? '—',
                            style: Theme.of(context).textTheme.titleLarge),
                        Text('+91 ${u?.phone ?? ''}',
                            style: const TextStyle(color: DvColors.textSecondary)),
                        const SizedBox(height: 6),
                        _MemberBadge(isMember: u?.isMember ?? false),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),
          _MenuItem(Icons.person_outline, 'Personal Details', () {}),
          _MenuItem(Icons.notifications_outlined, 'Notifications',
              () => context.push('/profile/settings/notifications')),
          _MenuItem(Icons.privacy_tip_outlined, 'Privacy & Data',
              () => context.push('/profile/settings/privacy')),
          _MenuItem(Icons.lock_outline, 'Security',
              () => context.push('/profile/settings/security')),
          _MenuItem(Icons.workspace_premium_outlined, 'Subscription',
              () => context.push('/profile/subscription')),
          _MenuItem(Icons.family_restroom, 'Family Members',
              () => context.push('/family')),
          _MenuItem(Icons.help_outline, 'Help & Support',
              () => context.push('/profile/help')),
          const Divider(height: 1),
          _MenuItem(Icons.logout, 'Logout', () async {
            await Supabase.instance.client.auth.signOut();
            if (context.mounted) context.go(Routes.phone);
          }, color: DvColors.critical),
        ],
      ),
    );
  }
}

class _MemberBadge extends StatelessWidget {
  const _MemberBadge({required this.isMember});
  final bool isMember;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: (isMember ? DvColors.accent : DvColors.textSecondary)
              .withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(isMember ? 'Member' : 'Free',
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isMember ? DvColors.accent : DvColors.textSecondary)),
      );
}

class _MenuItem extends StatelessWidget {
  const _MenuItem(this.icon, this.label, this.onTap, {this.color});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon, color: color ?? DvColors.primary),
        title: Text(label, style: TextStyle(color: color)),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      );
}
