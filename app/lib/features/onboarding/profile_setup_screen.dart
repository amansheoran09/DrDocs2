import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../l10n/l10n.dart';

/// OB-06 Profile Setup — collect name, DOB, city on first login and create the
/// users row with a generated referral code (Section 3.1 / 4.1).
class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _name = TextEditingController();
  DateTime? _dob;
  String _city = 'Gurgaon';
  bool _saving = false;
  String? _error;

  static const _cities = ['Gurgaon', 'Delhi', 'Noida', 'Faridabad', 'Other'];

  bool get _valid => _name.text.trim().isNotEmpty && _dob != null;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  String _referralCode(String name) {
    final prefix = name.replaceAll(RegExp(r'[^A-Za-z]'), '').toUpperCase();
    final p = prefix.isEmpty ? 'DV' : prefix.substring(0, min(4, prefix.length));
    final n = Random().nextInt(9000) + 1000;
    return '$p$n';
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    final client = Supabase.instance.client;
    final auth = client.auth.currentUser;
    if (auth == null) {
      setState(() => _error = 'Session expired. Please sign in again.');
      return;
    }
    try {
      await client.from('users').insert({
        'user_id': auth.id,
        'phone': auth.phone?.replaceFirst('91', '') ?? '',
        'full_name': _name.text.trim(),
        'dob': DateFormat('yyyy-MM-dd').format(_dob!),
        'city': _city,
        'referral_code': _referralCode(_name.text.trim()),
      });
      if (mounted) context.go(Routes.home);
    } catch (e) {
      setState(() => _error = 'Could not save profile: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: DateTime(now.year - 18),
    );
    if (picked != null) setState(() => _dob = picked);
  }

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.t('profile_title'))),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(labelText: l.t('full_name')),
              ),
              const SizedBox(height: 16),
              InkWell(
                onTap: _pickDob,
                child: InputDecorator(
                  decoration: InputDecoration(labelText: l.t('dob')),
                  child: Text(
                    _dob == null ? 'Select date' : DateFormat('dd MMM yyyy').format(_dob!),
                    style: TextStyle(
                        color: _dob == null
                            ? DvColors.textSecondary
                            : DvColors.textPrimary),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _city,
                decoration: InputDecoration(labelText: l.t('city')),
                items: _cities
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => setState(() => _city = v ?? 'Gurgaon'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: DvColors.critical)),
              ],
              const Spacer(),
              ElevatedButton(
                onPressed: _valid && !_saving ? _save : null,
                child: _saving
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : Text(l.t('continue_')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
