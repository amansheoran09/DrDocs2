import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../features/documents/all_documents_screen.dart';
import '../features/documents/add_document_screen.dart';
import '../features/documents/document_detail_screen.dart';
import '../features/documents/manual_entry_screen.dart';
import '../features/earn/earn_home_screen.dart';
import '../features/home/home_dashboard_screen.dart';
import '../features/onboarding/language_select_screen.dart';
import '../features/onboarding/otp_screen.dart';
import '../features/onboarding/phone_entry_screen.dart';
import '../features/onboarding/profile_setup_screen.dart';
import '../features/onboarding/splash_screen.dart';
import '../features/onboarding/welcome_carousel_screen.dart';
import '../features/profile/profile_home_screen.dart';
import '../features/services/service_detail_screen.dart';
import '../features/services/services_home_screen.dart';
import '../features/alerts/alerts_centre_screen.dart';
import '../widgets/dv_bottom_nav.dart';
import '../widgets/placeholder_screen.dart';

/// Route names mirror the Section 3 screen IDs so the codebase and the action
/// plan use the same vocabulary.
abstract final class Routes {
  static const splash = '/'; // OB-01
  static const language = '/language'; // OB-02
  static const welcome = '/welcome'; // OB-03
  static const phone = '/phone'; // OB-04
  static const otp = '/otp'; // OB-05
  static const profileSetup = '/profile-setup'; // OB-06

  static const home = '/home'; // HM-01
  static const documents = '/documents'; // DW-01
  static const services = '/services'; // SV-01
  static const earn = '/earn'; // ER-01
  static const profile = '/profile'; // PR-01

  static const addDocument = '/documents/add'; // DW-03
  static const manualEntry = '/documents/manual'; // DW-07
  static String documentDetail(String id) => '/documents/$id'; // DW-02
  static String serviceDetail(String id) => '/services/$id'; // SV-03
  static const alerts = '/alerts'; // AL-01
}

GoRouter buildRouter() {
  final auth = Supabase.instance.client.auth;

  return GoRouter(
    initialLocation: Routes.splash,
    refreshListenable: _AuthRefresh(auth),
    routes: [
      // ---- Onboarding (full-screen, no bottom nav) ----------------------
      GoRoute(path: Routes.splash, builder: (_, __) => const SplashScreen()),
      GoRoute(path: Routes.language, builder: (_, __) => const LanguageSelectScreen()),
      GoRoute(path: Routes.welcome, builder: (_, __) => const WelcomeCarouselScreen()),
      GoRoute(path: Routes.phone, builder: (_, __) => const PhoneEntryScreen()),
      GoRoute(
        path: Routes.otp,
        builder: (_, s) => OtpScreen(phone: s.uri.queryParameters['phone'] ?? ''),
      ),
      GoRoute(path: Routes.profileSetup, builder: (_, __) => const ProfileSetupScreen()),

      // ---- Main app shell with 5-tab bottom navigation ------------------
      StatefulShellRoute.indexedStack(
        builder: (_, __, shell) => _ScaffoldWithNav(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.home, builder: (_, __) => const HomeDashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.documents,
              builder: (_, __) => const AllDocumentsScreen(),
              routes: [
                GoRoute(path: 'add', builder: (_, __) => const AddDocumentScreen()),
                GoRoute(path: 'manual', builder: (_, __) => const ManualEntryScreen()),
                GoRoute(
                  path: ':id',
                  builder: (_, s) =>
                      DocumentDetailScreen(docId: s.pathParameters['id']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: Routes.services,
              builder: (_, __) => const ServicesHomeScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (_, s) =>
                      ServiceDetailScreen(serviceId: s.pathParameters['id']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.earn, builder: (_, __) => const EarnHomeScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: Routes.profile, builder: (_, __) => const ProfileHomeScreen()),
          ]),
        ],
      ),

      // ---- Alerts (pushed above the shell) ------------------------------
      GoRoute(path: Routes.alerts, builder: (_, __) => const AlertsCentreScreen()),

      // ---- Remaining Section 3 screens (scaffolded placeholders) --------
      ..._placeholders,
    ],
    redirect: (context, state) {
      final loggedIn = auth.currentSession != null;
      final loc = state.matchedLocation;
      const onboarding = {
        Routes.splash, Routes.language, Routes.welcome, Routes.phone,
        Routes.otp, Routes.profileSetup,
      };
      // Splash decides its own navigation; never bounce it.
      if (loc == Routes.splash) return null;
      if (!loggedIn && !onboarding.contains(loc)) return Routes.phone;
      return null;
    },
  );
}

/// Every other screen in the plan gets a real route -> placeholder.
final List<GoRoute> _placeholders = [
  ('/documents/digilocker', 'DW-06', 'DigiLocker Connect'),
  ('/documents/scan', 'DW-04', 'Camera Scan'),
  ('/family', 'FM-01', 'Family Home'),
  ('/alerts/health', 'AL-03', 'Health Score Detail'),
  ('/alerts/links', 'AL-04', 'Cross-Link Status'),
  ('/orders', 'SV-08', 'Order History'),
  ('/earn/refer', 'ER-02', 'Refer a Friend'),
  ('/earn/agent', 'ER-03', 'Become an Agent'),
  ('/earn/wallet', 'ER-05', 'DocCash Wallet'),
  ('/agent', 'AG-01', 'Agent Dashboard'),
  ('/profile/settings/notifications', 'PR-03', 'Notification Settings'),
  ('/profile/settings/privacy', 'PR-04', 'Privacy and Data'),
  ('/profile/settings/security', 'PR-05', 'Security Settings'),
  ('/profile/subscription', 'PR-06', 'Subscription'),
  ('/profile/help', 'PR-07', 'Help and Support'),
]
    .map((e) => GoRoute(
          path: e.$1,
          builder: (_, __) => PlaceholderScreen(screenId: e.$2, title: e.$3),
        ))
    .toList();

class _ScaffoldWithNav extends StatelessWidget {
  const _ScaffoldWithNav({required this.shell});
  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: shell,
      bottomNavigationBar: DvBottomNav(
        currentIndex: shell.currentIndex,
        onTap: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
      ),
    );
  }
}

/// Bridges Supabase auth changes into go_router's [refreshListenable].
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(GoTrueClient auth) {
    _sub = auth.onAuthStateChange.listen((_) => notifyListeners());
  }
  late final dynamic _sub;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
