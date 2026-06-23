import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';

/// Bottom navigation bar — 5 tabs (Section 7.1): Home, Documents, Services,
/// Earn, Profile. Active tab navy-filled, inactive grey outline.
class DvBottomNav extends StatelessWidget {
  const DvBottomNav({super.key, required this.currentIndex, required this.onTap});

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: onTap,
      backgroundColor: DvColors.card,
      indicatorColor: DvColors.primary.withValues(alpha: 0.12),
      destinations: const [
        NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: DvColors.primary),
            label: 'Home'),
        NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder, color: DvColors.primary),
            label: 'Documents'),
        NavigationDestination(
            icon: Icon(Icons.handyman_outlined),
            selectedIcon: Icon(Icons.handyman, color: DvColors.primary),
            label: 'Services'),
        NavigationDestination(
            icon: Icon(Icons.card_giftcard_outlined),
            selectedIcon: Icon(Icons.card_giftcard, color: DvColors.primary),
            label: 'Earn'),
        NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: DvColors.primary),
            label: 'Profile'),
      ],
    );
  }
}
