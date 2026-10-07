const { randomBytes } = require('crypto');

// Flat fare in UGX per seat per journey. To and fro counts as two journeys.
// Keep in sync with farePerSeatPerJourney in site-config.js (this server value is what gets charged).
const FARE_PER_SEAT_PER_JOURNEY = 3000;
const MAX_SEATS = 10;
const QUOTE_RIDE_TYPES = ['trips', 'school', 'airport', 'corporate', 'other'];

function fareFor(booking) {
  const seats = Number.parseInt(booking.seats, 10);
  if (!Number.isInteger(seats) || seats < 1 || seats > MAX_SEATS) return null;
  return FARE_PER_SEAT_PER_JOURNEY * seats * (booking.returnRide === 'yes' ? 2 : 1);
}

// Creates a booking number for a cash booking or quote request, or verifies a Flutterwave payment first.
// Confirmation happens on WhatsApp: the browser opens a prefilled wa.me message to
// Suburb Rides (+256 748 726 861) with the booking number and details. No emails are sent.
module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, booking, paymentMethod } = request.body || {};
    if (!booking || !booking.name || !booking.phone || !['cash', 'flutterwave', 'quote'].includes(paymentMethod)) {
      return response.status(400).json({ error: 'Missing payment or booking details' });
    }

    const rideType = booking.rideType || 'standard';
    const isQuote = paymentMethod === 'quote';
    if (isQuote !== QUOTE_RIDE_TYPES.includes(rideType) || (!isQuote && rideType !== 'standard')) {
      return response.status(400).json({ error: 'Invalid ride type for this payment method' });
    }

    // The amount is always worked out here, never taken from the browser.
    const amountDue = isQuote ? 0 : fareFor(booking);
    if (amountDue === null) return response.status(400).json({ error: 'Invalid number of seats' });

    if (paymentMethod === 'flutterwave') {
      if (!transactionId) return response.status(400).json({ error: 'Missing Flutterwave transaction' });
      const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const verified = await verification.json();
      const payment = verified.data;

      if (!verification.ok || verified.status !== 'success' || payment?.status !== 'successful' || payment.currency !== 'UGX' || Number(payment.amount) < amountDue) {
        return response.status(402).json({ error: 'Payment could not be verified' });
      }
    }

    const bookingNumber = `SR-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const amount = amountDue.toLocaleString('en-US');

    // Shows up in the Vercel function logs as a backup record of every booking.
    console.log(isQuote ? 'Quote requested' : 'Booking created', JSON.stringify({
      bookingNumber,
      rideType,
      paymentMethod,
      transactionId: transactionId || (isQuote ? 'QUOTE' : 'CASH_ON_PICKUP'),
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
