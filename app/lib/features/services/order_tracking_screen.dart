import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../models/order.dart';

/// SV-07 Order Tracking — live status timeline driven by a Supabase Realtime
/// subscription (Section 3.6 / 6.4). Status changes appear without refresh.
class OrderTrackingScreen extends ConsumerWidget {
  const OrderTrackingScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderStreamProvider(orderId));
    return Scaffold(
      appBar: AppBar(title: const Text('Order Tracking')),
      body: order.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, __) => Center(child: Text('Error: $e')),
        data: (o) {
          if (o == null) {
            return const Center(child: Text('Order not found'));
          }
          if (o.status == OrderStatus.cancelled) {
            return const Center(
              child: Text('This order was cancelled',
                  style: TextStyle(color: DvColors.critical)),
            );
          }
          final currentStep = OrderStatus.timeline.indexOf(o.status);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.event, color: DvColors.primary),
                      const SizedBox(width: 12),
                      Text('${o.bookingSlot} · ${o.addressCity}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ...List.generate(OrderStatus.timeline.length, (i) {
                final step = OrderStatus.timeline[i];
                final done = i <= currentStep && currentStep >= 0;
                final isCurrent = i == currentStep;
                return _TimelineRow(
                  label: step.label,
                  done: done,
                  current: isCurrent,
                  isLast: i == OrderStatus.timeline.length - 1,
                );
              }),
            ],
          );
        },
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.label,
    required this.done,
    required this.current,
    required this.isLast,
  });
  final String label;
  final bool done;
  final bool current;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = done ? DvColors.success : DvColors.border;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                child: done
                    ? const Icon(Icons.check, size: 16, color: Colors.white)
                    : null,
              ),
              if (!isLast)
                Expanded(child: Container(width: 2, color: color)),
            ],
          ),
          const SizedBox(width: 16),
          Padding(
            padding: const EdgeInsets.only(bottom: 24),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: current ? FontWeight.w700 : FontWeight.w500,
                color: done ? DvColors.textPrimary : DvColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
