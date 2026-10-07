// Public contact details used across the site. Not secrets.
// Every booking confirmation goes to this WhatsApp number.
window.SUBURB_RIDES = Object.freeze({
  brand: 'Suburb Rides',
  whatsappNumber: '256748726861', // international format for wa.me links, no "+"
  phoneDisplay: '0748 726 861',
  phoneTel: '+256748726861',
  farePerSeatPerJourney: 3000, // UGX. Keep in sync with api/complete-booking.js (the server is authoritative).
  whatsappLink(message) {
    const base = `https://wa.me/${this.whatsappNumber}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
  }
});
