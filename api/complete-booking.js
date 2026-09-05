const { randomBytes } = require('crypto');

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId, booking, expectedAmount, paymentMethod } = request.body || {};
    if (!booking || Number(expectedAmount) <= 0 || !['cash', 'flutterwave'].includes(paymentMethod)) {
      return response.status(400).json({ error: 'Missing payment or booking details' });
    }

    let payment = null;
    if (paymentMethod === 'flutterwave') {
      if (!transactionId) return response.status(400).json({ error: 'Missing Flutterwave transaction' });
      const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` }
      });
      const verified = await verification.json();
      payment = verified.data;

      if (!verification.ok || verified.status !== 'success' || payment?.status !== 'successful' || payment.currency !== 'UGX' || Number(payment.amount) < Number(expectedAmount)) {
        return response.status(402).json({ error: 'Payment could not be verified' });
      }
    }

    const bookingNumber = `R01-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const details = {
      bookingNumber,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      area: booking.area,
      pickupPoint: booking.pickupPoint,
      address: booking.address,
      seats: booking.seats,
      amount: Number(expectedAmount).toLocaleString('en-US'),
      transactionId: transactionId || 'CASH_ON_PICKUP',
      paymentMethod
    };

    const recipients = [process.env.ADMIN_EMAIL, booking.email].filter(Boolean);
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && recipients.length) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: recipients,
          subject: `${paymentMethod === 'cash' ? 'Cash' : 'Paid'} ride booking ${bookingNumber} | ${booking.name}`,
          html: `<h2>Route 01 ${paymentMethod === 'cash' ? 'cash' : 'paid'} booking</h2><p><strong>Booking number:</strong> ${bookingNumber}</p><p><strong>Name:</strong> ${details.name}<br><strong>Email:</strong> ${details.email}<br><strong>Phone:</strong> ${details.phone}<br><strong>Station:</strong> ${details.area}<br><strong>Meeting point:</strong> ${details.pickupPoint}<br><strong>Pickup:</strong> ${details.address}<br><strong>Pickup time:</strong> ${booking.pickupTime}<br><strong>Return ride:</strong> ${booking.returnRide}<br><strong>Seats:</strong> ${details.seats}<br><strong>Amount due:</strong> UGX ${details.amount}<br><strong>Payment method:</strong> ${paymentMethod}<br><strong>Flutterwave transaction:</strong> ${details.transactionId}</p>`
        })
      });
      if (!emailResponse.ok) {
        const emailError = await emailResponse.text();
        console.error('Resend email failed', emailResponse.status, emailError);
        return response.status(502).json({ error: 'Booking saved, but confirmation email could not be sent' });
      }
    }

    return response.status(200).json({ bookingNumber, amount: details.amount });
  } catch (error) {
    console.error('Booking completion failed', error);
    return response.status(500).json({ error: 'Unable to complete booking' });
  }
};
