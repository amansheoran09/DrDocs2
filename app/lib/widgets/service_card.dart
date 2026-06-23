import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';
import '../models/service.dart';

/// ServiceCard — SV-02 Service Category grid (Section 3.6).
class ServiceCard extends StatelessWidget {
  const ServiceCard({super.key, required this.service, this.onBook});

  final Service service;
  final VoidCallback? onBook; // -> SV-03 Service Detail

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onBook,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(service.name,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 6),
              Text(service.whatWeDo,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: DvColors.textSecondary)),
              const SizedBox(height: 10),
              if (service.govtFee > 0) const _GovtFeeBadge(),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text('₹${service.totalRupees.toStringAsFixed(0)}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                          color: DvColors.primary)),
                  const SizedBox(width: 8),
                  Text('· ~${service.estimatedDays} days',
                      style: const TextStyle(
                          fontSize: 12, color: DvColors.textSecondary)),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: onBook,
                    style: ElevatedButton.styleFrom(
                        minimumSize: const Size(96, 40)),
                    child: const Text('Book Now'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GovtFeeBadge extends StatelessWidget {
  const _GovtFeeBadge();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: DvColors.success.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Text('Govt fee included',
            style: TextStyle(
                fontSize: 11, color: DvColors.success, fontWeight: FontWeight.w600)),
      );
}
