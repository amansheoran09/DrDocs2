import 'package:flutter/material.dart';

/// DocVault colour palette — Section 7.1 Design System.
/// Hex values are taken verbatim from the action plan.
abstract final class DvColors {
  /// Navy Blue — headers, primary buttons, key text.
  static const Color primary = Color(0xFF1A3C6E);

  /// Orange — all Call-To-Action buttons and urgent alerts.
  static const Color action = Color(0xFFE8500A);

  /// Gold — premium features, score rings, membership badges.
  static const Color accent = Color(0xFFC9A84C);

  /// Green — valid document status, completed orders, positive scores.
  static const Color success = Color(0xFF1A6E37);

  /// Amber — expiring soon, 90 & 30 day alerts.
  static const Color warning = Color(0xFFB35900);

  /// Red — expired status, 7-day alerts, critical cross-link gaps.
  static const Color critical = Color(0xFF8B1A1A);

  /// Off-white — all screen backgrounds (not pure white).
  static const Color background = Color(0xFFF8F9FB);

  /// White — all cards and modals.
  static const Color card = Color(0xFFFFFFFF);

  static const Color textPrimary = Color(0xFF1A2330);
  static const Color textSecondary = Color(0xFF5B6472);
  static const Color border = Color(0xFFE3E7EE);

  /// Card shadow: rgba(0,0,0,0.08), 3dp elevation.
  static const Color cardShadow = Color(0x14000000);
}
