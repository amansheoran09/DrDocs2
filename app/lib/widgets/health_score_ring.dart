import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

import '../core/theme/dv_colors.dart';

/// Document Health Score ring — centrepiece of HM-01 and AL-03 (Section 6.1).
/// 0 = critical (red), 50 = average (amber), 80+ = well-managed (green).
class HealthScoreRing extends StatelessWidget {
  const HealthScoreRing({super.key, required this.score, this.radius = 80});

  final int score; // 0..100
  final double radius;

  Color get _color {
    if (score >= 80) return DvColors.success;
    if (score >= 50) return DvColors.accent;
    return DvColors.critical;
  }

  String get _label {
    if (score >= 80) return 'Well managed';
    if (score >= 50) return 'Average';
    return 'Needs attention';
  }

  @override
  Widget build(BuildContext context) {
    return CircularPercentIndicator(
      radius: radius,
      lineWidth: 12,
      percent: (score.clamp(0, 100)) / 100,
      animation: true,
      animationDuration: 900,
      circularStrokeCap: CircularStrokeCap.round,
      backgroundColor: DvColors.border,
      progressColor: _color,
      center: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$score',
              style: TextStyle(
                  fontSize: radius * 0.55,
                  fontWeight: FontWeight.w800,
                  color: _color,
                  height: 1)),
          const Text('Health Score',
              style: TextStyle(fontSize: 12, color: DvColors.textSecondary)),
          Text(_label,
              style: TextStyle(
                  fontSize: 11, color: _color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
