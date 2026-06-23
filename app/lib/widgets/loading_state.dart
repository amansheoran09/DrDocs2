import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';

/// LoadingState — skeleton loader (UX Rule 6: every API call shows a loading
/// state, skeleton for content, spinner for actions).
class LoadingState extends StatefulWidget {
  const LoadingState({super.key, this.lines = 4});
  final int lines;

  @override
  State<LoadingState> createState() => _LoadingStateState();
}

class _LoadingStateState extends State<LoadingState>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))
        ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween(begin: 0.4, end: 1.0).animate(_c),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: List.generate(
            widget.lines,
            (_) => Container(
              height: 84,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: DvColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DvColors.border),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
