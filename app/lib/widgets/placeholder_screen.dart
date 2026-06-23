import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';

/// Scaffolded-but-not-yet-built screen. Every screen ID in the Section 3
/// screen map has a route; the ones still on the backlog render this so the
/// navigation graph is complete and walkable from day one.
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.screenId, required this.title});

  final String screenId;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.construction, size: 48, color: DvColors.accent),
            const SizedBox(height: 12),
            Text(screenId,
                style: const TextStyle(
                    fontWeight: FontWeight.w700, color: DvColors.primary)),
            const SizedBox(height: 4),
            Text('$title — scaffolded',
                style: const TextStyle(color: DvColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
