# Uthando Vibes booking site

Static Vercel site with a Flutterwave checkout and Resend notifications.

## Vercel environment variables

Add these in the Vercel project settings for Production (and Preview if needed):

- `FLUTTERWAVE_PUBLIC_KEY`: Flutterwave public key used by the browser checkout
- `FLW_SECRET_KEY`: Flutterwave secret key used only by `/api/complete-booking`
- `RESEND_API_KEY`: Resend API key used to send paid-booking emails
- `RESEND_FROM_EMAIL`: verified sender, for example `Uthando Vibes <bookings@yourdomain.com>`
- `ADMIN_EMAIL`: inbox that receives every paid-booking notification

After Flutterwave reports success, the API verifies the transaction, checks the UGX amount, emails the admin and customer through Resend, and returns a generated booking number. The customer can then open WhatsApp with the booking number pre-filled.

The Resend sender domain must be verified in Resend. Never put `FLW_SECRET_KEY` or `RESEND_API_KEY` in frontend code.