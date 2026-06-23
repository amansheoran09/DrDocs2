import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../models/document.dart';
import '../../widgets/status_pill.dart';

/// DW-02 Document Detail — full fields, masked ID, expiry colour coding and
/// action buttons. Prominent Renew CTA when expiry within 90 days (Section 3.3).
final _docProvider = FutureProvider.family<DocVaultDocument, String>(
  (ref, id) => ref.watch(documentsRepoProvider).byId(id),
);

class DocumentDetailScreen extends ConsumerWidget {
  const DocumentDetailScreen({super.key, required this.docId});
  final String docId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final doc = ref.watch(_docProvider(docId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Document'),
        actions: const [Padding(padding: EdgeInsets.all(16), child: Icon(Icons.lock_outline, size: 18))],
      ),
      body: doc.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, __) => Center(child: Text('Error: $e')),
        data: (d) {
          final days = d.daysToExpiry;
          final showRenew = days != null && days <= 90;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              AspectRatio(
                aspectRatio: 16 / 10,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: d.docImageUrl == null
                      ? Container(
                          color: DvColors.background,
                          child: const Center(
                              child: Icon(Icons.image_outlined,
                                  size: 48, color: DvColors.textSecondary)),
                        )
                      : Image.network(d.docImageUrl!, fit: BoxFit.cover),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Text(d.docType.label,
                        style: Theme.of(context).textTheme.titleLarge),
                  ),
                  StatusPill(status: d.status, verified: d.isVerified),
                ],
              ),
              const SizedBox(height: 16),
              _Field('ID Number', d.maskedNumber),
              _Field('Name on Document', d.fullNameOnDoc),
              if (d.dobOnDoc != null)
                _Field('Date of Birth', DateFormat('dd MMM yyyy').format(d.dobOnDoc!)),
              _Field(
                  'Expiry',
                  d.expiryDate == null
                      ? 'No Expiry'
                      : DateFormat('dd MMM yyyy').format(d.expiryDate!),
                  valueColor: d.status.color),
              if (d.issuingAuthority != null)
                _Field('Issuing Authority', d.issuingAuthority!),
              const SizedBox(height: 24),
              if (showRenew)
                ElevatedButton.icon(
                  onPressed: () => context.go(Routes.services),
                  icon: const Icon(Icons.autorenew),
                  label: const Text('Renew with Dr.Docs'),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.share_outlined),
                      label: const Text('Share'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _confirmDelete(context, ref, d.docId),
                      icon: const Icon(Icons.delete_outline, color: DvColors.critical),
                      label: const Text('Delete',
                          style: TextStyle(color: DvColors.critical)),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref, String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete document?'),
        content: const Text('This removes the document and its image permanently.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Delete',
                  style: TextStyle(color: DvColors.critical))),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(documentsRepoProvider).delete(id);
      ref.invalidate(documentsProvider);
      if (context.mounted) context.go(Routes.documents);
    }
  }
}

class _Field extends StatelessWidget {
  const _Field(this.label, this.value, {this.valueColor});
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 140,
              child: Text(label,
                  style: const TextStyle(color: DvColors.textSecondary)),
            ),
            Expanded(
              child: Text(value,
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: valueColor ?? DvColors.textPrimary)),
            ),
          ],
        ),
      );
}
