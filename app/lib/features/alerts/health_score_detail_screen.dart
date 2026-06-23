import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../widgets/health_score_ring.dart';

/// AL-03 Health Score Detail — full breakdown of the four sub-scores computed
/// by the DB (Section 6.1) plus improvement tips.
class HealthScoreDetailScreen extends ConsumerWidget {
  const HealthScoreDetailScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final breakdown = ref.watch(healthBreakdownProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Health Score')),
      body: breakdown.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, __) => Center(child: Text('Error: $e')),
        data: (b) {
          if (b.isEmpty) {
            return const Center(child: Text('Sign in to see your score'));
          }
          final total = (b['total'] as num?)?.toInt() ?? 0;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Center(child: HealthScoreRing(score: total)),
              const SizedBox(height: 24),
              _SubScore('Completeness', (b['completeness'] as num?)?.toInt() ?? 0, 30,
                  'Do you have the 6 core documents?'),
              _SubScore('Validity', (b['validity'] as num?)?.toInt() ?? 0, 40,
                  'Are all your documents currently valid?'),
              _SubScore('Linkage', (b['linkage'] as num?)?.toInt() ?? 0, 20,
                  'Are your documents cross-linked (PAN-Aadhaar, etc.)?'),
              _SubScore('Accuracy', (b['accuracy'] as num?)?.toInt() ?? 0, 10,
                  'Do names and dates match across documents?'),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Improvement tips',
                          style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      ..._tips(b).map((t) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.lightbulb_outline,
                                    size: 18, color: DvColors.accent),
                                const SizedBox(width: 8),
                                Expanded(child: Text(t)),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  List<String> _tips(Map<String, dynamic> b) {
    final detail = (b['detail'] as Map?)?.cast<String, dynamic>() ?? {};
    final tips = <String>[];
    final core = (detail['core_docs_present'] as num?)?.toInt() ?? 0;
    if (core < 6) tips.add('Add ${6 - core} more core document(s) to reach full completeness.');
    if (((detail['expired'] as num?)?.toInt() ?? 0) > 0) {
      tips.add('Renew expired documents — each one costs you 8 points.');
    }
    if (((detail['links_verified'] as num?)?.toInt() ?? 0) < 4) {
      tips.add('Verify cross-links like PAN-Aadhaar to gain up to 20 points.');
    }
    if (tips.isEmpty) tips.add('Great job — your document health is excellent!');
    return tips;
  }
}

class _SubScore extends StatelessWidget {
  const _SubScore(this.label, this.value, this.max, this.hint);
  final String label;
  final int value;
  final int max;
  final String hint;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text('$value / $max',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, color: DvColors.primary)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: max == 0 ? 0 : value / max,
              minHeight: 8,
              backgroundColor: DvColors.border,
              color: DvColors.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(hint,
              style: const TextStyle(fontSize: 12, color: DvColors.textSecondary)),
        ],
      ),
    );
  }
}
