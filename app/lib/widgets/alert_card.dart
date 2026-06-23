import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';
import '../models/alert.dart';

/// AlertCard — used on HM-01 alert strip and AL-01 Alerts Centre.
class AlertCard extends StatelessWidget {
  const AlertCard({super.key, required this.alert, this.onTap, this.onFix});

  final Alert alert;
  final VoidCallback? onTap; // -> AL-02 Alert Detail
  final VoidCallback? onFix; // -> Fix with Dr.Docs

  @override
  Widget build(BuildContext context) {
    final color = alert.severity.color;
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(width: 4, height: 44, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(alert.title,
                        style: TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 15, color: color)),
                    const SizedBox(height: 4),
                    Text(alert.message,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 13, color: DvColors.textSecondary)),
                    if (onFix != null) ...[
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 40,
                        child: ElevatedButton(
                          onPressed: onFix,
                          child: const Text('Fix with Dr.Docs'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
