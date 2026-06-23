import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../l10n/l10n.dart';

/// OB-05 OTP Verification — 6-digit entry, 60s resend timer, Supabase verify
/// then route to profile setup (new) or home (returning).
class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key, required this.phone});
  final String phone;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _controller = TextEditingController();
  bool _verifying = false;
  String? _error;
  int _secondsLeft = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _secondsLeft = 60;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft == 0) {
        t.cancel();
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    setState(() {
      _verifying = true;
      _error = null;
    });
    try {
      final res = await Supabase.instance.client.auth.verifyOTP(
        type: OtpType.sms,
        phone: '+91${widget.phone}',
        token: _controller.text,
      );
      if (!mounted) return;
      // New user -> no profile row yet -> profile setup (OB-06).
      final uid = res.user?.id;
      final profile = uid == null
          ? null
          : await Supabase.instance.client
              .from('users')
              .select('user_id')
              .eq('user_id', uid)
              .maybeSingle();
      if (!mounted) return;
      context.go(profile == null ? Routes.profileSetup : Routes.home);
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Verification failed. Check the code and retry.');
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _resend() async {
    await Supabase.instance.client.auth.signInWithOtp(phone: '+91${widget.phone}');
    _startTimer();
  }

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.t('otp_title'),
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text('${l.t('otp_sent')} +91 ${widget.phone}',
                  style: const TextStyle(color: DvColors.textSecondary)),
              const SizedBox(height: 24),
              TextField(
                controller: _controller,
                keyboardType: TextInputType.number,
                maxLength: 6,
                textAlign: TextAlign.center,
                onChanged: (_) => setState(() {}),
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(
                    fontSize: 28, letterSpacing: 12, fontWeight: FontWeight.w700),
                decoration: const InputDecoration(counterText: '', hintText: '••••••'),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: _secondsLeft > 0
                    ? Text('${l.t('resend_otp')} in ${_secondsLeft}s',
                        style: const TextStyle(color: DvColors.textSecondary))
                    : TextButton(onPressed: _resend, child: Text(l.t('resend_otp'))),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: DvColors.critical)),
              ],
              const Spacer(),
              ElevatedButton(
                onPressed:
                    _controller.text.length == 6 && !_verifying ? _verify : null,
                child: _verifying
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : Text(l.t('verify')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
