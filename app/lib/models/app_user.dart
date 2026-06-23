/// Maps the `users` table (Section 4.1).
class AppUser {
  AppUser({
    required this.userId,
    required this.phone,
    required this.fullName,
    required this.dob,
    this.city = 'Gurgaon',
    this.email,
    this.profilePhotoUrl,
    this.language = 'en',
    required this.referralCode,
    this.referredBy,
    this.docHealthScore = 0,
    this.subscriptionStatus = 'free',
    this.subscriptionExpiry,
    this.doccashBalance = 0,
    this.isAgent = false,
    this.agentCertified = false,
  });

  final String userId;
  final String phone;
  final String fullName;
  final DateTime dob;
  final String city;
  final String? email;
  final String? profilePhotoUrl;
  final String language;
  final String referralCode;
  final String? referredBy;
  final int docHealthScore;
  final String subscriptionStatus;
  final DateTime? subscriptionExpiry;

  /// DocCash balance in paise.
  final int doccashBalance;
  final bool isAgent;
  final bool agentCertified;

  bool get isMember => subscriptionStatus == 'member';
  double get doccashRupees => doccashBalance / 100.0;
  String get firstName => fullName.split(' ').first;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        userId: j['user_id'] as String,
        phone: j['phone'] as String,
        fullName: (j['full_name'] as String?) ?? '',
        dob: DateTime.tryParse(j['dob'] as String? ?? '') ?? DateTime(1990),
        city: (j['city'] as String?) ?? 'Gurgaon',
        email: j['email'] as String?,
        profilePhotoUrl: j['profile_photo_url'] as String?,
        language: (j['language'] as String?) ?? 'en',
        referralCode: (j['referral_code'] as String?) ?? '',
        referredBy: j['referred_by'] as String?,
        docHealthScore: (j['doc_health_score'] as int?) ?? 0,
        subscriptionStatus: (j['subscription_status'] as String?) ?? 'free',
        subscriptionExpiry: j['subscription_expiry'] == null
            ? null
            : DateTime.tryParse(j['subscription_expiry'] as String),
        doccashBalance: (j['doccash_balance'] as int?) ?? 0,
        isAgent: (j['is_agent'] as bool?) ?? false,
        agentCertified: (j['agent_certified'] as bool?) ?? false,
      );
}
