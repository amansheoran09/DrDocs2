import 'package:flutter/material.dart';

import '../core/theme/dv_theme.dart';
import '../models/document.dart';

/// Status pill — top-right of every Document Card (Section 7.2).
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.status, this.verified = true});

  final DocStatus status;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    final (label, color) = verified
        ? (_label(status), status.color)
        : ('Not Verified', const Color(0xFF8A929E));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(DvRadii.pill),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }

  static String _label(DocStatus s) => switch (s) {
        DocStatus.valid => 'Valid',
        DocStatus.expiringSoon => 'Expiring Soon',
        DocStatus.expired => 'Expired',
        DocStatus.needsRenewal => 'Needs Renewal',
      };
}
