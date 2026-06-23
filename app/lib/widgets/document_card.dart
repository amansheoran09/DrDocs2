import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/theme/dv_colors.dart';
import '../core/theme/dv_theme.dart';
import '../models/document.dart';
import 'status_pill.dart';

/// DocumentCard — the most-seen UI element (Section 7.2 specification).
///
/// Shows the type icon, status pill, name, masked ID, expiry line and a
/// thumbnail. Adds an orange days-remaining strip when expiring within 90
/// days, and a red EXPIRED overlay with a Renew action when expired.
class DocumentCard extends StatelessWidget {
  const DocumentCard({super.key, required this.doc, this.onTap, this.onRenew});

  final DocVaultDocument doc;
  final VoidCallback? onTap; // -> DW-02 Document Detail
  final VoidCallback? onRenew; // -> Renew with Dr.Docs

  @override
  Widget build(BuildContext context) {
    final days = doc.daysToExpiry;
    final expiringSoon = days != null && days >= 0 && days <= 90;
    final expired = doc.status == DocStatus.expired;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _TypeIcon(type: doc.docType),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                doc.docType.label,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: DvColors.textPrimary,
                                ),
                              ),
                            ),
                            StatusPill(status: doc.status, verified: doc.isVerified),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(doc.maskedNumber,
                            style: const TextStyle(
                                fontSize: 14, color: DvColors.textSecondary)),
                        const SizedBox(height: 2),
                        Text(
                          doc.expiryDate == null
                              ? 'No Expiry'
                              : 'Valid until ${DateFormat('MMM yyyy').format(doc.expiryDate!)}',
                          style: const TextStyle(
                              fontSize: 13, color: DvColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  // Bottom-right thumbnail.
                  const SizedBox(width: 8),
                  _Thumb(url: doc.thumbnailUrl),
                ],
              ),
            ),
            if (expired)
              _ExpiredStrip(onRenew: onRenew)
            else if (expiringSoon)
              _ExpiringStrip(days: days),
          ],
        ),
      ),
    );
  }
}

class _TypeIcon extends StatelessWidget {
  const _TypeIcon({required this.type});
  final DocType type;

  IconData get _icon => switch (type) {
        DocType.aadhaar => Icons.fingerprint,
        DocType.pan => Icons.credit_card,
        DocType.passport => Icons.flight_takeoff,
        DocType.drivingLicense => Icons.directions_car,
        DocType.voterId => Icons.how_to_vote,
        DocType.vehicleRc => Icons.car_rental,
        DocType.class10Cert || DocType.class12Cert => Icons.school,
        DocType.bankPassbook => Icons.account_balance,
        DocType.healthCard => Icons.local_hospital,
        _ => Icons.description,
      };

  @override
  Widget build(BuildContext context) => Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: DvColors.primary.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(_icon, size: 24, color: DvColors.primary),
      );
}

class _Thumb extends StatelessWidget {
  const _Thumb({this.url});
  final String? url;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 48,
        height: 48,
        child: url == null
            ? Container(
                color: DvColors.background,
                child: const Icon(Icons.image_outlined,
                    size: 20, color: DvColors.textSecondary),
              )
            : Image.network(url!, fit: BoxFit.cover),
      ),
    );
  }
}

class _ExpiringStrip extends StatelessWidget {
  const _ExpiringStrip({required this.days});
  final int days;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        color: DvColors.warning.withValues(alpha: 0.12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            const Icon(Icons.timelapse, size: 16, color: DvColors.warning),
            const SizedBox(width: 6),
            Text('Expires in $days days',
                style: const TextStyle(
                    color: DvColors.warning, fontWeight: FontWeight.w600, fontSize: 13)),
          ],
        ),
      );
}

class _ExpiredStrip extends StatelessWidget {
  const _ExpiredStrip({this.onRenew});
  final VoidCallback? onRenew;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        color: DvColors.critical.withValues(alpha: 0.12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            const Icon(Icons.error_outline, size: 16, color: DvColors.critical),
            const SizedBox(width: 6),
            const Text('EXPIRED',
                style: TextStyle(
                    color: DvColors.critical, fontWeight: FontWeight.w700, fontSize: 13)),
            const Spacer(),
            TextButton(
              onPressed: onRenew,
              style: TextButton.styleFrom(
                foregroundColor: DvColors.action,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 32),
              ),
              child: const Text('Renew Now'),
            ),
          ],
        ),
      );
}
