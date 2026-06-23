import 'package:docvault/models/document.dart';
import 'package:flutter_test/flutter_test.dart';

/// The authoritative Document Health Score lives in the database
/// (supabase/migrations/0007_functions_triggers.sql) and is validated in
/// supabase/test/health_score.sql. These tests cover the client-side helpers
/// on the document model used to render the score's inputs.
void main() {
  group('DocVaultDocument', () {
    test('masks the ID number to last 4 digits (Section 10)', () {
      final doc = DocVaultDocument(
        docId: 'd1',
        userId: 'u1',
        docType: DocType.aadhaar,
        docNumber: '123456784521',
        fullNameOnDoc: 'Mayur Rana',
        source: 'manual',
        status: DocStatus.valid,
      );
      expect(doc.maskedNumber, 'XXXX XXXX 4521');
    });

    test('returns em dash when no number present', () {
      final doc = DocVaultDocument(
        docId: 'd1',
        userId: 'u1',
        docType: DocType.birthCert,
        fullNameOnDoc: 'Mayur Rana',
        source: 'manual',
        status: DocStatus.valid,
      );
      expect(doc.maskedNumber, '—');
    });

    test('parses expiry and computes days remaining', () {
      final future = DateTime.now().add(const Duration(days: 45));
      final doc = DocVaultDocument.fromJson({
        'doc_id': 'd1',
        'user_id': 'u1',
        'doc_type': 'passport',
        'full_name_on_doc': 'Mayur Rana',
        'source': 'manual',
        'status': 'valid',
        'expiry_date': future.toIso8601String(),
      });
      expect(doc.daysToExpiry, inInclusiveRange(44, 45));
      expect(doc.docType, DocType.passport);
    });

    test('DocStatus maps wire values and colours', () {
      expect(DocStatus.fromString('expiring_soon'), DocStatus.expiringSoon);
      expect(DocStatus.fromString('expired'), DocStatus.expired);
      expect(DocStatus.fromString(null), DocStatus.valid);
    });
  });
}
