import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';

/// Alert severity (Section 4.2 / 6.2) with the filter-tab colours from AL-01.
enum AlertSeverity {
  critical,
  urgent,
  warning,
  info;

  static AlertSeverity fromString(String? s) => switch (s) {
        'critical' => AlertSeverity.critical,
        'urgent' => AlertSeverity.urgent,
        'warning' => AlertSeverity.warning,
        _ => AlertSeverity.info,
      };

  Color get color => switch (this) {
        AlertSeverity.critical => DvColors.critical,
        AlertSeverity.urgent => DvColors.action,
        AlertSeverity.warning => DvColors.warning,
        AlertSeverity.info => DvColors.primary,
      };
}

/// Maps the `alerts` table (Section 4.2).
class Alert {
  Alert({
    required this.alertId,
    required this.userId,
    this.docId,
    required this.alertType,
    required this.severity,
    required this.title,
    required this.message,
    this.isRead = false,
    this.isDismissed = false,
    this.relatedServiceId,
    required this.firesAt,
  });

  final String alertId;
  final String userId;
  final String? docId;
  final String alertType;
  final AlertSeverity severity;
  final String title;
  final String message;
  final bool isRead;
  final bool isDismissed;
  final String? relatedServiceId;
  final DateTime firesAt;

  factory Alert.fromJson(Map<String, dynamic> j) => Alert(
        alertId: j['alert_id'] as String,
        userId: j['user_id'] as String,
        docId: j['doc_id'] as String?,
        alertType: j['alert_type'] as String,
        severity: AlertSeverity.fromString(j['severity'] as String?),
        title: j['title'] as String,
        message: j['message'] as String,
        isRead: (j['is_read'] as bool?) ?? false,
        isDismissed: (j['is_dismissed'] as bool?) ?? false,
        relatedServiceId: j['related_service_id'] as String?,
        firesAt: DateTime.tryParse(j['fires_at'] as String? ?? '') ?? DateTime.now(),
      );
}
