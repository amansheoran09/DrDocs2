import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/router.dart';
import '../../core/theme/dv_colors.dart';
import '../../l10n/l10n.dart';

/// OB-03 Welcome Carousel — 3-slide value-prop intro with a Skip button.
class WelcomeCarouselScreen extends StatefulWidget {
  const WelcomeCarouselScreen({super.key});

  @override
  State<WelcomeCarouselScreen> createState() => _WelcomeCarouselScreenState();
}

class _WelcomeCarouselScreenState extends State<WelcomeCarouselScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_page < 2) {
      _controller.nextPage(
          duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    } else {
      context.go(Routes.phone);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = L10n.of(context);
    final slides = [
      (Icons.document_scanner, l.t('welcome_1_title'), l.t('welcome_1_body')),
      (Icons.notifications_active, l.t('welcome_2_title'), l.t('welcome_2_body')),
      (Icons.home_repair_service, l.t('welcome_3_title'), l.t('welcome_3_body')),
    ];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: () => context.go(Routes.phone),
                child: Text(l.t('skip')),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: slides.length,
                itemBuilder: (_, i) {
                  final s = slides[i];
                  return Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(s.$1, size: 120, color: DvColors.primary),
                        const SizedBox(height: 40),
                        Text(s.$2,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineMedium),
                        const SizedBox(height: 16),
                        Text(s.$3,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 16, color: DvColors.textSecondary)),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                3,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _page == i ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _page == i ? DvColors.primary : DvColors.border,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: ElevatedButton(
                onPressed: _next,
                child: Text(_page == 2 ? l.t('get_started') : l.t('continue_')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
