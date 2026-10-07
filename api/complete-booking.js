const { randomBytes } = require('crypto');

// Creates a booking number for a cash booking, or verifies a Flutterwave payment first.
// Confirmation happens on WhatsApp: the browser opens a prefilled wa.me message to
// Suburb Rides (+256 748 726 861) with the booking number and details. No emails are sent.
module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, booking, expectedAmount, paymentMethod } = request.body || {};
    if (!booking || !booking.name || !booking.phone || Number(expectedAmount) <= 0 || !['cash', 'flutterwave'].includes(paymentMethod)) {
      return response.status(400).json({ error: 'Missing payment or booking details' });
    }

    if (paymentMethod === 'flutterwave') {
      if (!transactionId) return response.status(400).json({ error: 'Missing Flutterwave transaction' });
      const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const verified = await verification.json();
      const payment = verified.data;

      if (!verification.ok || verified.status !== 'success' || payment?.status !== 'successful' || payment.currency !== 'UGX' || Number(payment.amount) < Number(expectedAmount)) {
        return response.status(402).json({ error: 'Payment could not be verified' });
      }
    }

    const bookingNumber = `SR-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const amount = Number(expectedAmount).toLocaleString('en-US');

    // Shows up in the Vercel function logs as a backup record of every booking.
    console.log('Booking created', JSON.stringify({
      bookingNumber,
      paymentMethod,
      transactionId: transactionId || 'CASH_ON_PICKUP',
      amount,
      name: booking.name,
      phone: booking.phone,
      area: booking.area,
      address: booking.address,
      destination: booking.destination,
      rideDate: booking.rideDate,
      pickupTime: booking.pickupTime,
      returnRide: booking.returnRide,
      seats: booking.seats
    }));

    return response.status(200).json({ bookingNumber, amount });
  } catch (error) {
    console.error('Booking completion failed', error);
    return response.status(500).json({ error: 'Unable to complete booking' });
  }
};
