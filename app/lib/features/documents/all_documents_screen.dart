import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../data/repositories.dart';
import '../../l10n/l10n.dart';
import '../../models/document.dart';
import '../../widgets/document_card.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_state.dart';

/// DW-01 All Documents — master list with category tabs (Section 3.3).
class AllDocumentsScreen extends ConsumerStatefulWidget {
  const AllDocumentsScreen({super.key});

  @override
  ConsumerState<AllDocumentsScreen> createState() => _AllDocumentsScreenState();
}

class _AllDocumentsScreenState extends ConsumerState<AllDocumentsScreen> {
  // null == "All"
  DocCategory? _filter;

  static const _tabs = <(String, DocCategory?)>[
    ('All', null),
    ('Identity', DocCategory.identity),
    ('Travel', DocCategory.travel),
    ('Vehicle', DocCategory.vehicle),
    ('Education', DocCategory.education),
    ('Financial', DocCategory.financial),
    ('Health', DocCategory.health),
  ];

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    final docs = ref.watch(documentsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.t('all_documents'))),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go(Routes.addDocument),
        icon: const Icon(Icons.add),
        label: Text(l.t('add_document')),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _tabs.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final tab = _tabs[i];
                final selected = _filter == tab.$2;
                return Center(
                  child: ChoiceChip(
                    label: Text(tab.$1),
                    selected: selected,
                    onSelected: (_) => setState(() => _filter = tab.$2),
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: docs.when(
              loading: () => const LoadingState(),
              error: (e, __) => Center(child: Text('Error: $e')),
              data: (list) {
                final filtered = _filter == null
                    ? list
                    : list.where((d) => d.docType.category == _filter).toList();
                if (filtered.isEmpty) {
                  return EmptyState(
                    icon: Icons.folder_open,
                    title: l.t('no_docs_title'),
                    message: l.t('no_docs_body'),
                    actionLabel: l.t('add_document'),
                    onAction: () => context.go(Routes.addDocument),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(documentsProvider);
                    await ref.read(documentsProvider.future);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final d = filtered[i];
                      return DocumentCard(
                        doc: d,
                        onTap: () => context.go(Routes.documentDetail(d.docId)),
                        onRenew: () => context.go(Routes.services),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
