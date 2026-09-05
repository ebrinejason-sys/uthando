# Route 01 booking site

Static Vercel site with cash-on-pickup reservations, Flutterwave mobile-money checkout, and Resend notifications.

## Vercel environment variables

Add these in the Vercel project settings for Production (and Preview if needed):

- `FLUTTERWAVE_PUBLIC_KEY`: Flutterwave public key used by the browser checkout
- `FLW_SECRET_KEY`: Flutterwave secret key used only by `/api/complete-booking`
- `RESEND_API_KEY`: Resend API key used to send paid-booking emails
- `RESEND_FROM_EMAIL`: verified sender, for example `Route 01 <bookings@yourdomain.com>`
- `ADMIN_EMAIL`: inbox that receives every paid-booking notification

Customers can choose cash on pickup or mobile money through Flutterwave. For online payments, the API verifies the transaction and UGX amount before emailing the admin and customer through Resend. Cash reservations are recorded without payment verification and show the amount due in the booking notification. Both paths return a generated booking number, which the customer can open in WhatsApp pre-filled.

The Resend sender domain must be verified in Resend. Never put `FLW_SECRET_KEY` or `RESEND_API_KEY` in frontend code.
