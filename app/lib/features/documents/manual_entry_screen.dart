import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../data/repositories.dart';
import '../../models/document.dart';

/// DW-07 Manual Entry — type selector + dynamic fields, saved to Supabase.
/// The DB derives status + recomputes the health score on insert (0007).
class ManualEntryScreen extends ConsumerStatefulWidget {
  const ManualEntryScreen({super.key});

  @override
  ConsumerState<ManualEntryScreen> createState() => _ManualEntryScreenState();
}

class _ManualEntryScreenState extends ConsumerState<ManualEntryScreen> {
  DocType _type = DocType.aadhaar;
  final _name = TextEditingController();
  final _number = TextEditingController();
  DateTime? _expiry;
  bool _saving = false;
  String? _error;

  /// Types that carry an expiry date (others are non-expiring).
  bool get _hasExpiry => const {
        DocType.passport,
        DocType.drivingLicense,
        DocType.healthCard,
      }.contains(_type);

  bool get _valid => _name.text.trim().isNotEmpty;

  @override
  void dispose() {
    _name.dispose();
    _number.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) {
      setState(() => _error = 'Not signed in');
      return;
    }
    try {
      await ref.read(documentsRepoProvider).insert(DocVaultDocument(
            docId: '',
            userId: uid,
            docType: _type,
            docNumber: _number.text.trim().isEmpty ? null : _number.text.trim(),
            fullNameOnDoc: _name.text.trim(),
            expiryDate: _hasExpiry ? _expiry : null,
            source: 'manual',
            status: DocStatus.valid,
          ));
      ref.invalidate(documentsProvider);
      if (mounted) context.go(Routes.documents);
    } catch (e) {
      setState(() => _error = 'Could not save: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Enter Manually')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          DropdownButtonFormField<DocType>(
            value: _type,
            decoration: const InputDecoration(labelText: 'Document type'),
            items: DocType.values
                .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                .toList(),
            onChanged: (v) => setState(() => _type = v ?? DocType.aadhaar),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Name on document'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _number,
            decoration: const InputDecoration(labelText: 'ID number (optional)'),
          ),
          if (_hasExpiry) ...[
            const SizedBox(height: 16),
            InkWell(
              onTap: () async {
                final now = DateTime.now();
                final d = await showDatePicker(
                  context: context,
                  initialDate: now,
                  firstDate: DateTime(now.year - 30),
                  lastDate: DateTime(now.year + 30),
                );
                if (d != null) setState(() => _expiry = d);
              },
              child: InputDecorator(
                decoration: const InputDecoration(labelText: 'Expiry date'),
                child: Text(
                  _expiry == null
                      ? 'Select date'
                      : DateFormat('dd MMM yyyy').format(_expiry!),
                ),
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: DvColors.critical)),
          ],
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _valid && !_saving ? _save : null,
            child: _saving
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Save'),
          ),
        ],
      ),
    );
  }
}
