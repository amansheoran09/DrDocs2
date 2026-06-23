import 'package:flutter/material.dart';

import '../core/theme/dv_colors.dart';

/// Document validity status (Section 4.2 `documents.status`, colours from 7.2).
enum DocStatus {
  valid,
  expiringSoon,
  expired,
  needsRenewal;

  static DocStatus fromString(String? s) => switch (s) {
        'expiring_soon' => DocStatus.expiringSoon,
        'expired' => DocStatus.expired,
        'needs_renewal' => DocStatus.needsRenewal,
        _ => DocStatus.valid,
      };

  String get wire => switch (this) {
        DocStatus.expiringSoon => 'expiring_soon',
        DocStatus.expired => 'expired',
        DocStatus.needsRenewal => 'needs_renewal',
        DocStatus.valid => 'valid',
      };

  /// Status pill colour (Section 7.2 Document Card).
  Color get color => switch (this) {
        DocStatus.valid => DvColors.success,
        DocStatus.expiringSoon => DvColors.warning,
        DocStatus.needsRenewal => DvColors.warning,
        DocStatus.expired => DvColors.critical,
      };
}

/// Supported document types (Section 4.2 + Section 5.2 supported OCR docs).
enum DocType {
  aadhaar('aadhaar', 'Aadhaar Card', DocCategory.identity),
  pan('pan', 'PAN Card', DocCategory.identity),
  passport('passport', 'Passport', DocCategory.travel),
  drivingLicense('driving_license', 'Driving License', DocCategory.vehicle),
  voterId('voter_id', 'Voter ID', DocCategory.identity),
  birthCert('birth_cert', 'Birth Certificate', DocCategory.identity),
  marriageCert('marriage_cert', 'Marriage Certificate', DocCategory.identity),
  class10Cert('class10_cert', 'Class 10 Certificate', DocCategory.education),
  class12Cert('class12_cert', 'Class 12 Certificate', DocCategory.education),
  vehicleRc('vehicle_rc', 'Vehicle RC', DocCategory.vehicle),
  bankPassbook('bank_passbook', 'Bank Passbook', DocCategory.financial),
  rationCard('ration_card', 'Ration Card', DocCategory.identity),
  pensionCard('pension_card', 'Pension Card', DocCategory.financial),
  healthCard('health_card', 'Health Card', DocCategory.health),
  other('other', 'Document', DocCategory.identity);

  const DocType(this.wire, this.label, this.category);
  final String wire;
  final String label;
  final DocCategory category;

  static DocType fromString(String? s) =>
      DocType.values.firstWhere((t) => t.wire == s, orElse: () => DocType.other);
}

/// Category tabs on DW-01 All Documents.
enum DocCategory { identity, travel, vehicle, education, financial, health }

class DocVaultDocument {
  DocVaultDocument({
    required this.docId,
    required this.userId,
    this.memberId,
    required this.docType,
    this.docNumber,
    required this.fullNameOnDoc,
    this.dobOnDoc,
    this.issueDate,
    this.expiryDate,
    this.issuingAuthority,
    this.docImageUrl,
    this.thumbnailUrl,
    required this.source,
    this.ocrConfidence,
    this.isVerified = false,
    required this.status,
  });

  final String docId;
  final String userId;
  final String? memberId;
  final DocType docType;
  final String? docNumber;
  final String fullNameOnDoc;
  final DateTime? dobOnDoc;
  final DateTime? issueDate;
  final DateTime? expiryDate;
  final String? issuingAuthority;
  final String? docImageUrl;
  final String? thumbnailUrl;
  final String source;
  final double? ocrConfidence;
  final bool isVerified;
  final DocStatus status;

  /// Masked ID number for display — show only last 4 (Section 10, Section 7.2).
  String get maskedNumber {
    final n = docNumber;
    if (n == null || n.length < 4) return n ?? '—';
    final last4 = n.substring(n.length - 4);
    return 'XXXX XXXX $last4';
  }

  int? get daysToExpiry {
    final e = expiryDate;
    if (e == null) return null;
    return e.difference(DateTime.now()).inDays;
  }

  factory DocVaultDocument.fromJson(Map<String, dynamic> j) => DocVaultDocument(
        docId: j['doc_id'] as String,
        userId: j['user_id'] as String,
        memberId: j['member_id'] as String?,
        docType: DocType.fromString(j['doc_type'] as String?),
        docNumber: j['doc_number'] as String?,
        fullNameOnDoc: (j['full_name_on_doc'] as String?) ?? '',
        dobOnDoc: _date(j['dob_on_doc']),
        issueDate: _date(j['issue_date']),
        expiryDate: _date(j['expiry_date']),
        issuingAuthority: j['issuing_authority'] as String?,
        docImageUrl: j['doc_image_url'] as String?,
        thumbnailUrl: j['thumbnail_url'] as String?,
        source: (j['source'] as String?) ?? 'manual',
        ocrConfidence: (j['ocr_confidence'] as num?)?.toDouble(),
        isVerified: (j['is_verified'] as bool?) ?? false,
        status: DocStatus.fromString(j['status'] as String?),
      );

  Map<String, dynamic> toInsert() => {
        'user_id': userId,
        if (memberId != null) 'member_id': memberId,
        'doc_type': docType.wire,
        'doc_number': docNumber,
        'full_name_on_doc': fullNameOnDoc,
        'dob_on_doc': dobOnDoc?.toIso8601String(),
        'issue_date': issueDate?.toIso8601String(),
        'expiry_date': expiryDate?.toIso8601String(),
        'issuing_authority': issuingAuthority,
        'doc_image_url': docImageUrl,
        'thumbnail_url': thumbnailUrl,
        'source': source,
        'ocr_confidence': ocrConfidence,
        'is_verified': isVerified,
      };

  static DateTime? _date(dynamic v) =>
      v == null ? null : DateTime.tryParse(v as String);
}
