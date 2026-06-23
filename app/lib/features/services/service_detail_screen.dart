import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../models/service.dart';

/// SV-03 Service Detail — what we do, docs required, price breakdown and the
/// money-back guarantee, with the Book Now CTA (Section 3.6).
class ServiceDetailScreen extends ConsumerWidget {
  const ServiceDetailScreen({super.key, required this.serviceId});
  final String serviceId;

  String _rupees(int paise) => '₹${(paise / 100).toStringAsFixed(0)}';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.watch(serviceByIdProvider(serviceId));
    return Scaffold(
      appBar: AppBar(title: const Text('Service')),
      body: service.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, __) => Center(child: Text('Error: $e')),
        data: (s) => _Body(service: s, rupees: _rupees),
      ),
      bottomNavigationBar: service.maybeWhen(
        data: (s) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ElevatedButton(
              onPressed: () {
                // -> SV-04 Document Checklist (scaffolded)
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Next: Document Checklist (SV-04)')),
                );
              },
              child: Text('Book Now · ${_rupees(s.totalPrice)}'),
            ),
          ),
        ),
        orElse: () => const SizedBox.shrink(),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.service, required this.rupees});
  final Service service;
  final String Function(int) rupees;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(service.name, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(service.description,
            style: const TextStyle(color: DvColors.textSecondary, height: 1.4)),
        const SizedBox(height: 20),
        _Section(
          title: 'What Dr.Docs does',
          child: Text(service.whatWeDo, style: const TextStyle(height: 1.5)),
        ),
        _Section(
          title: 'Documents required',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: service.docsRequired
                .map((d) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_outline,
                              size: 18, color: DvColors.success),
                          const SizedBox(width: 8),
                          Expanded(child: Text(d)),
                        ],
                      ),
                    ))
                .toList(),
          ),
        ),
        _Section(
          title: 'Price breakdown',
          child: Column(
            children: [
              _PriceRow('Government fee', rupees(service.govtFee)),
              _PriceRow('Dr.Docs service fee', rupees(service.serviceFee)),
              const Divider(),
              _PriceRow('Total', rupees(service.totalPrice), bold: true),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: DvColors.success.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.verified_user, color: DvColors.success),
              const SizedBox(width: 12),
              Expanded(
                child: Text('100% money-back guarantee · ~${service.estimatedDays} days',
                    style: const TextStyle(
                        color: DvColors.success, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            child,
          ],
        ),
      );
}

class _PriceRow extends StatelessWidget {
  const _PriceRow(this.label, this.value, {this.bold = false});
  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
            Text(value,
                style: TextStyle(
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
          ],
        ),
      );
}
