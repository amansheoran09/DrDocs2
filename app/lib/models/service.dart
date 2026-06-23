/// Maps the `services` catalogue (Section 4.3).
class Service {
  Service({
    required this.serviceId,
    required this.category,
    required this.name,
    required this.description,
    required this.whatWeDo,
    required this.docsRequired,
    required this.govtFee,
    required this.serviceFee,
    required this.totalPrice,
    required this.estimatedDays,
    this.isActive = true,
    this.sortOrder = 0,
  });

  final String serviceId;
  final String category;
  final String name;
  final String description;
  final String whatWeDo;
  final List<String> docsRequired;

  /// All fees in paise.
  final int govtFee;
  final int serviceFee;
  final int totalPrice;
  final int estimatedDays;
  final bool isActive;
  final int sortOrder;

  double get totalRupees => totalPrice / 100.0;

  factory Service.fromJson(Map<String, dynamic> j) => Service(
        serviceId: j['service_id'] as String,
        category: j['category'] as String,
        name: j['name'] as String,
        description: (j['description'] as String?) ?? '',
        whatWeDo: (j['what_we_do'] as String?) ?? '',
        docsRequired: ((j['docs_required'] as List?) ?? const [])
            .map((e) => e.toString())
            .toList(),
        govtFee: (j['govt_fee'] as int?) ?? 0,
        serviceFee: (j['service_fee'] as int?) ?? 0,
        totalPrice: (j['total_price'] as int?) ?? 0,
        estimatedDays: (j['estimated_days'] as int?) ?? 0,
        isActive: (j['is_active'] as bool?) ?? true,
        sortOrder: (j['sort_order'] as int?) ?? 0,
      );
}
