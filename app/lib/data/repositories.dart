import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/alert.dart';
import '../models/app_user.dart';
import '../models/document.dart';
import '../models/order.dart';
import '../models/service.dart';

/// Single Supabase client handle.
final supabaseProvider = Provider<SupabaseClient>((_) => Supabase.instance.client);

/// Current auth state stream (drives the router redirect / splash).
final authStateProvider = StreamProvider<AuthState>(
  (ref) => ref.watch(supabaseProvider).auth.onAuthStateChange,
);

/// ---------------------------------------------------------------------------
/// Profile (users table)
/// ---------------------------------------------------------------------------
final currentUserProvider = FutureProvider<AppUser?>((ref) async {
  final client = ref.watch(supabaseProvider);
  final uid = client.auth.currentUser?.id;
  if (uid == null) return null;
  final row = await client.from('users').select().eq('user_id', uid).maybeSingle();
  return row == null ? null : AppUser.fromJson(row);
});

/// ---------------------------------------------------------------------------
/// Documents (DW-01 / DW-02). RLS restricts to the signed-in user.
/// ---------------------------------------------------------------------------
class DocumentsRepository {
  DocumentsRepository(this._c);
  final SupabaseClient _c;

  /// All of the user's own documents, urgent-expiry first (DW-01 ordering).
  Future<List<DocVaultDocument>> all() async {
    final rows = await _c
        .from('documents')
        .select()
        .filter('member_id', 'is', null)
        .order('expiry_date', ascending: true, nullsFirst: false);
    return (rows as List)
        .map((e) => DocVaultDocument.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DocVaultDocument> byId(String docId) async {
    final row = await _c.from('documents').select().eq('doc_id', docId).single();
    return DocVaultDocument.fromJson(row);
  }

  /// Insert a scanned / manual document. The DB derives status + recomputes
  /// the health score via triggers (migration 0007).
  Future<DocVaultDocument> insert(DocVaultDocument doc) async {
    final row = await _c.from('documents').insert(doc.toInsert()).select().single();
    return DocVaultDocument.fromJson(row);
  }

  Future<void> delete(String docId) =>
      _c.from('documents').delete().eq('doc_id', docId);
}

final documentsRepoProvider =
    Provider((ref) => DocumentsRepository(ref.watch(supabaseProvider)));

final documentsProvider = FutureProvider<List<DocVaultDocument>>(
  (ref) => ref.watch(documentsRepoProvider).all(),
);

/// ---------------------------------------------------------------------------
/// Alerts (AL-01)
/// ---------------------------------------------------------------------------
final alertsProvider = FutureProvider<List<Alert>>((ref) async {
  final c = ref.watch(supabaseProvider);
  final rows = await c
      .from('alerts')
      .select()
      .eq('is_dismissed', false)
      .order('fires_at', ascending: false);
  return (rows as List).map((e) => Alert.fromJson(e as Map<String, dynamic>)).toList();
});

/// ---------------------------------------------------------------------------
/// Services catalogue (SV-01 / SV-02) — public-readable.
/// ---------------------------------------------------------------------------
final servicesProvider = FutureProvider<List<Service>>((ref) async {
  final c = ref.watch(supabaseProvider);
  final rows = await c
      .from('services')
      .select()
      .eq('is_active', true)
      .order('sort_order', ascending: true);
  return (rows as List).map((e) => Service.fromJson(e as Map<String, dynamic>)).toList();
});

final serviceByIdProvider = FutureProvider.family<Service, String>((ref, id) async {
  final c = ref.watch(supabaseProvider);
  final row = await c.from('services').select().eq('service_id', id).single();
  return Service.fromJson(row);
});

/// ---------------------------------------------------------------------------
/// Orders (SV-07 live tracking via Realtime, SV-08 history)
/// ---------------------------------------------------------------------------
final orderHistoryProvider = FutureProvider<List<Order>>((ref) async {
  final c = ref.watch(supabaseProvider);
  final rows =
      await c.from('orders').select().order('created_at', ascending: false);
  return (rows as List).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

/// Realtime subscription to a single order's status (SV-07).
final orderStreamProvider = StreamProvider.family<Order?, String>((ref, orderId) {
  final c = ref.watch(supabaseProvider);
  return c
      .from('orders')
      .stream(primaryKey: ['order_id'])
      .eq('order_id', orderId)
      .map((rows) => rows.isEmpty ? null : Order.fromJson(rows.first));
});
