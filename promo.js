// One-off promo: Essence Music live band at Villa Gabon, Thursday 8 October 2026.
// To switch it off, set enabled to false. To remove it completely, delete this file,
// promo.css, assets/essence-music-flyer.jpg, the #promo-slot div and the promo
// <script>/<link> tags in index.html. It also hides itself after `endsAt`.
(() => {
  const PROMO = {
    enabled: true,
    endsAt: '2026-10-09T06:00:00+03:00', // auto-hides the morning after the event (EAT)
    event: 'Essence Music live band',
    venue: 'Villa Gabon',
    dateLabel: 'Thursday 8 October 2026',
    fares: [
      { route: 'Ishaka → Villa Gabon', price: 'UGX 3,000', note: 'per journey' },
      { route: 'Villa Gabon → Ishaka', price: 'UGX 3,000', note: 'per journey' }
    ],
    totalLabel: 'To and fro total',
    total: 'UGX 6,000',
    bookingPreset: { rideType: 'standard', area: 'Ishaka Town', destination: 'Villa Gabon (Essence Music)', rideDate: '2026-10-08', returnRide: 'yes' }
  };

  const slot = document.getElementById('promo-slot');
  const site = window.SUBURB_RIDES;
  if (!slot || !site || !PROMO.enabled || Date.now() > new Date(PROMO.endsAt).getTime()) return;

  const message = `Hello ${site.brand}, I would like a ride for ${PROMO.event} at ${PROMO.venue} on ${PROMO.dateLabel}.\nTrip: To and fro (UGX 6,000) / One way (UGX 3,000)\nName:\nPickup point in Ishaka:\nSeats:`;

  slot.innerHTML = `
    <section class="promo" aria-labelledby="promoTitle">
      <div class="promo-inner">
        <div class="promo-copy">
          <p class="promo-tag">Event special · Limited time</p>
          <h2 id="promoTitle">Heading to <i>Essence Music?</i></h2>
          <p class="promo-sub">We've got your ride!</p>
          <ul class="promo-meta">
            <li><b>Live band</b>${PROMO.event.replace(' live band', '')}</li>
            <li><b>Venue</b>${PROMO.venue}</li>
            <li><b>Date</b>${PROMO.dateLabel}</li>
          </ul>
          <div class="promo-fares">
            ${PROMO.fares.map((fare) => `<div><small>${fare.route}</small><strong>${fare.price}</strong><span>${fare.note}</span></div>`).join('')}
            <div class="promo-total"><small>${PROMO.totalLabel}</small><strong>${PROMO.total}</strong></div>
          </div>
          <a class="button promo-button" id="promoBook" href="${site.whatsappLink(message)}" target="_blank" rel="noopener noreferrer">Book your Essence ride <span aria-hidden="true">→</span></a>
          <p class="promo-script">Good music. Great vibes. Same ride!</p>
        </div>
        <img class="promo-flyer" src="assets/essence-music-flyer.jpg" alt="Suburb Rides flyer for Essence Music at Villa Gabon, 8 October" width="640" height="960" loading="lazy">
      </div>
    </section>`;

  // Opens the booking form pre-filled for the event (flat fare: UGX 3,000 per journey, 6,000 to and fro).
  // Falls back to the WhatsApp link above if the booking form is not on the page.
  document.getElementById('promoBook').addEventListener('click', (event) => {
    if (!window.SuburbBooking) return;
    event.preventDefault();
    window.SuburbBooking.open(PROMO.bookingPreset);
  });
})();
