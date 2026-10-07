# Suburb Rides booking site

*Your ride, your way.* Static Vercel site for Suburb Rides (Ishaka, Bushenyi, Bweji, Bassajja and surrounding areas) with cash-on-pickup bookings, Flutterwave mobile-money checkout, and **WhatsApp-only booking confirmation** to 0748 726 861 (+256 748 726 861).

## How booking confirmation works

1. The customer fills in the booking form and chooses cash on pickup or mobile money (Flutterwave).
2. `/api/complete-booking` verifies the Flutterwave payment (mobile money only) and returns a booking number (`SR-YYYY-XXXXXX`).
3. The confirmation dialog shows a **Confirm on WhatsApp** button that opens `https://wa.me/256748726861` with the full booking details prefilled. The customer taps send, and the booking is confirmed in that WhatsApp chat.

No confirmation emails are sent. The WhatsApp number lives in `site-config.js`.

## Vercel environment variables

- `FLUTTERWAVE_PUBLIC_KEY`: Flutterwave public key used by the browser checkout
- `FLW_SECRET_KEY`: Flutterwave secret key used only by `/api/complete-booking`

Never put `FLW_SECRET_KEY` in frontend code. The old `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `ADMIN_EMAIL` variables are no longer used and can be removed.

Every booking is also logged (`Booking created ...`) in the Vercel function logs as a backup record.

## Event promo (Essence Music, Villa Gabon, 8 Oct 2026)

The promo banner lives entirely in `promo.js`, `promo.css` and `assets/essence-music-flyer.jpg`, and renders into `<div id="promo-slot">` in `index.html`. It hides itself after the event (`endsAt`). Set `enabled: false` in `promo.js` to switch it off, or delete those files plus the slot and its `<script>`/`<link>` tags to remove it.
