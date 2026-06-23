/// Order lifecycle states (Section 4.3 / SV-07 tracking timeline).
enum OrderStatus {
  pendingPayment,
  confirmed,
  agentAssigned,
  enRoute,
  collected,
  processing,
  completed,
  cancelled;

  static OrderStatus fromString(String? s) => switch (s) {
        'confirmed' => OrderStatus.confirmed,
        'agent_assigned' => OrderStatus.agentAssigned,
        'en_route' => OrderStatus.enRoute,
        'collected' => OrderStatus.collected,
        'processing' => OrderStatus.processing,
        'completed' => OrderStatus.completed,
        'cancelled' => OrderStatus.cancelled,
        _ => OrderStatus.pendingPayment,
      };

  /// Human label shown on the SV-07 tracking timeline.
  String get label => switch (this) {
        OrderStatus.pendingPayment => 'Pending Payment',
        OrderStatus.confirmed => 'Confirmed',
        OrderStatus.agentAssigned => 'Agent Assigned',
        OrderStatus.enRoute => 'Agent En Route',
        OrderStatus.collected => 'Documents Collected',
        OrderStatus.processing => 'Processing',
        OrderStatus.completed => 'Completed',
        OrderStatus.cancelled => 'Cancelled',
      };

  /// Ordered timeline steps for the progress tracker.
  static const List<OrderStatus> timeline = [
    OrderStatus.confirmed,
    OrderStatus.agentAssigned,
    OrderStatus.enRoute,
    OrderStatus.collected,
    OrderStatus.processing,
    OrderStatus.completed,
  ];
}

/// Maps the `orders` table (Section 4.3).
class Order {
  Order({
    required this.orderId,
    required this.userId,
    required this.serviceId,
    this.agentId,
    required this.status,
    required this.bookingDate,
    required this.bookingSlot,
    required this.addressLine1,
    required this.addressCity,
    required this.addressPincode,
    required this.totalAmount,
    this.paymentStatus = 'pending',
    this.rating,
    this.reviewText,
  });

  final String orderId;
  final String userId;
  final String serviceId;
  final String? agentId;
  final OrderStatus status;
  final DateTime bookingDate;
  final String bookingSlot;
  final String addressLine1;
  final String addressCity;
  final String addressPincode;
  final int totalAmount; // paise
  final String paymentStatus;
  final int? rating;
  final String? reviewText;

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        orderId: j['order_id'] as String,
        userId: j['user_id'] as String,
        serviceId: j['service_id'] as String,
        agentId: j['agent_id'] as String?,
        status: OrderStatus.fromString(j['status'] as String?),
        bookingDate:
            DateTime.tryParse(j['booking_date'] as String? ?? '') ?? DateTime.now(),
        bookingSlot: (j['booking_slot'] as String?) ?? '',
        addressLine1: (j['address_line1'] as String?) ?? '',
        addressCity: (j['address_city'] as String?) ?? '',
        addressPincode: (j['address_pincode'] as String?) ?? '',
        totalAmount: (j['total_amount'] as int?) ?? 0,
        paymentStatus: (j['payment_status'] as String?) ?? 'pending',
        rating: j['rating'] as int?,
        reviewText: j['review_text'] as String?,
      );
}
