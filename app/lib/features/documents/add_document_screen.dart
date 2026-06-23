import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';

/// DW-03 Add Document — Method Select (Section 3.3). Four ways to add a doc.
class AddDocumentScreen extends StatelessWidget {
  const AddDocumentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Document')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _MethodCard(
            icon: Icons.document_scanner,
            title: 'Scan with Camera',
            subtitle: 'Point your camera — we read the details automatically.',
            onTap: () => context.push('/documents/scan'),
          ),
          _MethodCard(
            icon: Icons.photo_library_outlined,
            title: 'Upload from Gallery',
            subtitle: 'Pick an existing photo of your document.',
            onTap: () => context.push('/documents/scan'),
          ),
          _MethodCard(
            icon: Icons.account_balance_outlined,
            title: 'Pull from DigiLocker',
            subtitle: 'Import verified documents directly from DigiLocker.',
            onTap: () => context.push('/documents/digilocker'),
          ),
          _MethodCard(
            icon: Icons.edit_note,
            title: 'Enter Manually',
            subtitle: 'Type in the details yourself.',
            onTap: () => context.go(Routes.manualEntry),
          ),
        ],
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  const _MethodCard(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.onTap});
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Card(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: CircleAvatar(
              backgroundColor: DvColors.primary.withValues(alpha: 0.1),
              child: Icon(icon, color: DvColors.primary),
            ),
            title: Text(title,
                style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(subtitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: onTap,
          ),
        ),
      );
}
