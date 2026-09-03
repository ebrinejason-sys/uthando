const { randomBytes } = require('crypto');

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, booking, expectedAmount } = request.body || {};
    if (!transactionId || !booking || Number(expectedAmount) <= 0) {
      return response.status(400).json({ error: 'Missing payment or booking details' });
    }

    const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
    });
    const verified = await verification.json();
    const payment = verified.data;

    if (!verification.ok || verified.status !== 'success' || payment?.status !== 'successful' || payment.currency !== 'UGX' || Number(payment.amount) < Number(expectedAmount)) {
      return response.status(402).json({ error: 'Payment could not be verified' });
    }

    const bookingNumber = `UV-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const details = {
      bookingNumber,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      area: booking.area,
      address: booking.address,
      seats: booking.seats,
      amount: Number(expectedAmount).toLocaleString('en-US'),
      transactionId
    };

    const recipients = [process.env.ADMIN_EMAIL, booking.email].filter(Boolean);
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && recipients.length) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: recipients,
          subject: `Paid ride booking ${bookingNumber} | ${booking.name}`,
          html: `<h2>Uthando Vibes paid booking</h2><p><strong>Booking number:</strong> ${bookingNumber}</p><p><strong>Name:</strong> ${details.name}<br><strong>Email:</strong> ${details.email}<br><strong>Phone:</strong> ${details.phone}<br><strong>Station:</strong> ${details.area}<br><strong>Pickup:</strong> ${details.address}<br><strong>Pickup time:</strong> ${booking.pickupTime}<br><strong>Return ride:</strong> ${booking.returnRide}<br><strong>Seats:</strong> ${details.seats}<br><strong>Paid:</strong> UGX ${details.amount}<br><strong>Flutterwave transaction:</strong> ${details.transactionId}</p>`
        })
      });
    }

    return response.status(200).json({ bookingNumber, amount: details.amount });
  } catch (error) {
    console.error('Booking completion failed', error);
    return response.status(500).json({ error: 'Unable to complete booking' });
  }
};
