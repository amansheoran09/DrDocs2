import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'dv_colors.dart';

/// DocVault theme — Section 7.1.
///
/// Typography:
///   * Poppins — headlines and display text.
///   * Inter   — body text, labels, form fields.
///   * Noto Sans Devanagari — Hindi text (applied via [hindiTextTheme] when
///     the active locale is `hi`).
///
/// Sizing tokens: 16sp body, 14sp secondary, 12sp captions, 22sp card titles.
/// Radius: 12 cards, 8 buttons, 20 pills, 24 bottom sheets.
abstract final class DvRadii {
  static const double card = 12;
  static const double button = 8;
  static const double pill = 20;
  static const double sheet = 24;
}

abstract final class DvTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: DvColors.background,
      colorScheme: ColorScheme.fromSeed(
        seedColor: DvColors.primary,
        primary: DvColors.primary,
        secondary: DvColors.action,
        tertiary: DvColors.accent,
        error: DvColors.critical,
        surface: DvColors.card,
      ),
    );

    final display = GoogleFonts.poppinsTextTheme(base.textTheme);
    final body = GoogleFonts.interTextTheme(base.textTheme);

    final textTheme = base.textTheme.copyWith(
      // Display / headline / title -> Poppins
      displayLarge: display.displayLarge,
      headlineLarge: display.headlineLarge,
      headlineMedium: display.headlineMedium?.copyWith(fontWeight: FontWeight.w600),
      titleLarge: display.titleLarge?.copyWith(fontSize: 22, fontWeight: FontWeight.w600),
      titleMedium: display.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      // Body / labels -> Inter
      bodyLarge: body.bodyLarge?.copyWith(fontSize: 16),
      bodyMedium: body.bodyMedium?.copyWith(fontSize: 14),
      bodySmall: body.bodySmall?.copyWith(fontSize: 12, color: DvColors.textSecondary),
      labelLarge: body.labelLarge?.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
    ).apply(
      bodyColor: DvColors.textPrimary,
      displayColor: DvColors.textPrimary,
    );

    return base.copyWith(
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: DvColors.background,
        foregroundColor: DvColors.primary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: DvColors.card,
        elevation: 3,
        shadowColor: DvColors.cardShadow,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DvRadii.card),
        ),
        margin: EdgeInsets.zero,
      ),
      // Primary CTA: 52dp, full width (Section 7.1).
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: DvColors.action,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DvRadii.button),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: DvColors.primary,
          minimumSize: const Size.fromHeight(44),
          side: const BorderSide(color: DvColors.primary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DvRadii.button),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: DvColors.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DvRadii.button),
          borderSide: const BorderSide(color: DvColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DvRadii.button),
          borderSide: const BorderSide(color: DvColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DvRadii.button),
          borderSide: const BorderSide(color: DvColors.primary, width: 2),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: DvColors.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(DvRadii.sheet)),
        ),
      ),
    );
  }

  /// Wrap the base theme with Noto Sans Devanagari for Hindi locale.
  static ThemeData hindi() {
    final t = light();
    return t.copyWith(
      textTheme: GoogleFonts.notoSansDevanagariTextTheme(t.textTheme),
    );
  }
}
