const site = window.SUBURB_RIDES;
const $ = (selector) => document.querySelector(selector);

const FARE = site.farePerSeatPerJourney;
const RIDE_TYPES = {
  standard: 'Standard ride',
  trips: 'Trips & picnics',
  school: 'School & campus transport',
  airport: 'Airport transfer',
  corporate: 'Corporate & group transport',
  other: 'Something else'
};

const html = document.documentElement;
const bookingDialog = $('#bookingDialog');
const bookingTitle = $('#bookingTitle');
const form = $('#bookingForm');
const rideType = $('#rideType');
const returnRide = $('#returnRide');
const paymentField = $('#paymentField');
const paymentMethod = $('#paymentMethod');
const seats = $('#seats');
const rideDate = $('#rideDate');
const emailField = $('#emailField');
const emailInput = $('#email');
const total = $('#total');
const status = $('#status');
const submitButton = $('#submitButton');
const submitLabel = submitButton.querySelector('.submit-label');
const confirmationDialog = $('#confirmationDialog');
const bookingNumber = $('#bookingNumber');
const bookingSummary = $('#bookingSummary');
const whatsappConfirm = $('#whatsappConfirm');
const confirmationLabel = $('#confirmationLabel');
const confirmationTitle = $('#dialogTitle');
const dialogCopy = $('#dialogCopy');
const reminder = $('#bookingReminder');
let flutterwavePublicKey = '';
let lastOpener = null;

fetch('/api/config')
  .then((response) => (response.ok ? response.json() : {}))
  .then((config) => { flutterwavePublicKey = config.flutterwavePublicKey || ''; })
  .catch(() => {});

const formatUGX = (value) => `UGX ${Number(value || 0).toLocaleString('en-US')}`;
const isQuote = () => rideType.value !== 'standard';

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

// Flat fare: UGX 3,000 per seat per journey. To and fro = 2 journeys.
function calculateAmount() {
  if (isQuote()) return 0;
  return FARE * Number(seats.value || 1) * (returnRide.value === 'yes' ? 2 : 1);
}

function updateForm() {
  const quote = isQuote();
  total.textContent = quote ? 'Quoted' : formatUGX(calculateAmount());
  paymentField.hidden = quote;
  paymentMethod.required = !quote;
  const needsEmail = !quote && paymentMethod.value === 'flutterwave';
  emailField.hidden = !needsEmail;
  emailInput.required = needsEmail;
  submitLabel.textContent = quote ? 'Request a quote' : needsEmail ? 'Continue to payment' : 'Book my ride';
}

rideDate.min = todayISO();
[rideType, returnRide, seats, paymentMethod].forEach((field) => field.addEventListener('change', updateForm));
form.addEventListener('input', (event) => event.target.removeAttribute('aria-invalid'));
updateForm();

/* ---------- Modal helpers ---------- */
function syncScrollLock() {
  html.classList.toggle('modal-open', Boolean(document.querySelector('dialog[open]')));
}

// Close a dialog when the backdrop (the <dialog> element itself, outside its content) is clicked.
function enableBackdropClose(dialog) {
  let downOnBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => { downOnBackdrop = event.target === dialog; });
  dialog.addEventListener('click', (event) => {
    if (downOnBackdrop && event.target === dialog) dialog.close();
    downOnBackdrop = false;
  });
  dialog.addEventListener('close', syncScrollLock);
}
enableBackdropClose(bookingDialog);
enableBackdropClose(confirmationDialog);

function markBookingSeen() {
  try { sessionStorage.setItem('sr-booking-seen', '1'); } catch (error) { /* storage unavailable */ }
}

function openBooking(preset = {}, opener = document.activeElement) {
  markBookingSeen();
  if (confirmationDialog.open) confirmationDialog.close();
  Object.entries(preset).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && value !== undefined) field.value = value;
  });
  updateForm();
  lastOpener = opener instanceof HTMLElement ? opener : null;
  if (!bookingDialog.open) bookingDialog.showModal();
  syncScrollLock();
  bookingDialog.querySelector('form').scrollTop = 0;
  bookingDialog.scrollTop = 0;
  // Focus the heading rather than an input so phones don't pop the keyboard straight away.
  bookingTitle.focus({ preventScroll: true });
}

bookingDialog.addEventListener('close', () => {
  if (lastOpener && document.contains(lastOpener) && !confirmationDialog.open) lastOpener.focus({ preventScroll: true });
});

$('#bookingClose').addEventListener('click', () => bookingDialog.close());

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open-booking]');
  if (!trigger) return;
  event.preventDefault();
  openBooking(trigger.dataset.rideType ? { rideType: trigger.dataset.rideType } : {}, trigger);
});

// Shared links like /#book open the form directly.
if (location.hash === '#book' || location.hash === '#booking') setTimeout(() => openBooking({}, null), 300);

// Open the form once per browser session: after 12 seconds, or when the visitor reaches the fares.
(function autoOpenOnce() {
  try { if (sessionStorage.getItem('sr-booking-seen')) return; } catch (error) { return; }
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    observer?.disconnect();
    let seen = false;
    try { seen = Boolean(sessionStorage.getItem('sr-booking-seen')); } catch (error) { seen = true; }
    if (seen || document.querySelector('dialog[open]') || document.hidden) return;
    openBooking({}, null);
  };
  const timer = setTimeout(fire, 12000);
  const pricing = $('#pricing');
  const observer = pricing && 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) setTimeout(fire, 600); }, { threshold: 0.5 })
    : null;
  if (observer) observer.observe(pricing);
}());

/* ---------- Confirmation ---------- */
const closeConfirmation = () => confirmationDialog.close();
$('#dialogClose').addEventListener('click', closeConfirmation);
$('#dialogDone').addEventListener('click', closeConfirmation);
$('#reminderClose').addEventListener('click', () => { reminder.hidden = true; });

function buildWhatsAppMessage(data, booking) {
  const quote = data.rideType !== 'standard';
  const paid = data.paymentMethod === 'flutterwave';
  const lines = [
    quote ? `Hello ${site.brand}, I would like a quote.` : `Hello ${site.brand}, I am confirming my booking.`,
    '',
    `${quote ? 'Request' : 'Booking'} no: ${booking.bookingNumber}`,
    `Ride type: ${RIDE_TYPES[data.rideType] || data.rideType}`,
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Pickup area: ${data.area}`,
    `Pickup point/address: ${data.address}`,
    `Destination: ${data.destination}`,
    `Date: ${formatDate(data.rideDate)}`,
    `Pickup time: ${formatTime(data.pickupTime)}`,
    `Trip: ${data.returnRide === 'yes' ? 'To and fro' : 'One way'}`,
    `Seats: ${data.seats}`
  ];
  if (quote) {
    lines.push('Price: please send me a quote');
  } else {
    lines.push(`Fare: UGX ${FARE.toLocaleString('en-US')} per seat per journey`);
    lines.push(`Total: UGX ${booking.amount}`);
    lines.push(`Payment: ${paid ? `Mobile money, PAID (Flutterwave ID ${booking.transactionId})` : 'Cash on pickup'}`);
  }
  return lines.join('\n');
}

function validate(data) {
  const required = ['name', 'phone', 'rideType', 'area', 'address', 'destination', 'rideDate', 'pickupTime', 'returnRide'];
  if (data.rideType === 'standard') required.push('paymentMethod');
  if (data.rideType === 'standard' && data.paymentMethod === 'flutterwave') required.push('email');
  const missing = required.filter((key) => !String(data[key] || '').trim());
  if (required.includes('email') && data.email && !emailInput.checkValidity()) missing.push('email');
  missing.forEach((key) => form.elements[key]?.setAttribute('aria-invalid', 'true'));
  if (missing.length) form.elements[missing[0]]?.focus();
  return missing.length === 0;
}

const setBusy = (isBusy) => { submitButton.disabled = isBusy; };

function showConfirmation(data, booking) {
  const quote = data.rideType !== 'standard';
  const paid = data.paymentMethod === 'flutterwave';
  const link = site.whatsappLink(buildWhatsAppMessage(data, booking));
  const trip = data.returnRide === 'yes' ? 'to and fro' : 'one way';

  bookingNumber.textContent = booking.bookingNumber;
  bookingSummary.textContent = `${data.area} → ${data.destination} · ${formatDate(data.rideDate)}, ${formatTime(data.pickupTime)} · ${data.seats} seat(s), ${trip}${quote ? '' : ` · UGX ${booking.amount}`}`;
  confirmationLabel.textContent = quote ? 'Quote request saved' : paid ? 'Payment received' : 'Booking saved';
  confirmationTitle.innerHTML = quote ? 'One tap<br><i>for your quote.</i>' : 'One tap<br><i>to confirm.</i>';
  if (quote) {
    dialogCopy.innerHTML = `Send your request to us on WhatsApp at <b>${site.phoneDisplay}</b> and we will reply with a price for your ${RIDE_TYPES[data.rideType].toLowerCase()}.`;
  } else if (paid) {
    dialogCopy.innerHTML = `Your mobile money payment of <b>UGX ${booking.amount}</b> went through. Your ride is confirmed once you send the booking to us on WhatsApp at <b>${site.phoneDisplay}</b>.`;
  } else {
    dialogCopy.innerHTML = `Your ride is confirmed once you send the booking to us on WhatsApp at <b>${site.phoneDisplay}</b>. Pay your driver <b>UGX ${booking.amount}</b> in cash at pickup.`;
  }
  whatsappConfirm.href = link;

  $('#reminderText').textContent = `${quote ? 'Request' : 'Booking'} ${booking.bookingNumber} is not confirmed until you send it on WhatsApp.`;
  $('#reminderLink').href = link;
  reminder.hidden = false;

  status.className = 'status';
  status.textContent = '';
  if (bookingDialog.open) bookingDialog.close();
  confirmationDialog.showModal();
  syncScrollLock();
  form.reset();
  updateForm();
}

function showError(text, helpMessage = `Hello ${site.brand}, I need help booking a ride.`) {
  status.className = 'status error';
  status.innerHTML = '';
  status.append(`${text} `);
  const link = document.createElement('a');
  link.href = site.whatsappLink(helpMessage);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `WhatsApp us on ${site.phoneDisplay} ↗`;
  status.append(link);
  if (!bookingDialog.open) openBooking({}, lastOpener);
  status.scrollIntoView({ block: 'nearest' });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.className = 'status';
  status.textContent = '';

  const data = Object.fromEntries(new FormData(form));
  if (!validate(data)) {
    status.className = 'status error';
    status.textContent = 'Please complete all required ride details.';
    return;
  }

  const quote = data.rideType !== 'standard';
  if (quote) { data.paymentMethod = 'quote'; delete data.email; }
  const amount = calculateAmount();
  const booking = { ...data };
  if (data.paymentMethod !== 'flutterwave') delete booking.email;
  setBusy(true);

  const completeBooking = (transactionId = null) => fetch('/api/complete-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, expectedAmount: amount, paymentMethod: data.paymentMethod, booking })
  })
    .then((result) => result.json().then((body) => ({ ok: result.ok, body })))
    .then(({ ok, body }) => {
      if (!ok) throw new Error(body.error || 'Booking failed');
      showConfirmation(data, { bookingNumber: body.bookingNumber, amount: body.amount, transactionId });
    })
    .catch(() => (transactionId
      ? showError(`We could not verify your mobile money payment. If money left your account, send us your Flutterwave ID (${transactionId}).`, `Hello ${site.brand}, I paid for a ride but the booking did not go through. Flutterwave ID: ${transactionId}. Name: ${data.name}.`)
      : showError('We could not complete your booking.')))
    .finally(() => setBusy(false));

  if (data.paymentMethod !== 'flutterwave') {
    status.textContent = quote ? 'Saving your request...' : 'Saving your booking...';
    completeBooking();
    return;
  }

  if (!(window.FlutterwaveCheckout && flutterwavePublicKey && !flutterwavePublicKey.includes('REPLACE_WITH'))) {
    setBusy(false);
    showError('Mobile money is not available right now. Please choose cash on pickup, or');
    return;
  }

  let paymentSucceeded = false;
  // Flutterwave draws its own overlay; close our modal so it is not stuck on top.
  bookingDialog.close();
  const checkout = window.FlutterwaveCheckout({
    public_key: flutterwavePublicKey,
    tx_ref: `SR-${Date.now()}`,
    amount,
    currency: 'UGX',
    payment_options: 'mobilemoneyuganda',
    customer: { email: data.email, phone_number: data.phone, name: data.name },
    meta: { area: data.area, destination: data.destination, ride_date: data.rideDate, pickup_time: data.pickupTime, seats: data.seats, trip: data.returnRide === 'yes' ? 'to-and-fro' : 'one-way' },
    customizations: { title: `${site.brand} ride`, description: `${data.seats} seat(s), ${data.returnRide === 'yes' ? 'to and fro' : 'one way'}: ${data.area} to ${data.destination}, ${formatDate(data.rideDate)} ${formatTime(data.pickupTime)}`, logo: '' },
    callback: (response) => {
      if (response.status === 'successful') {
        paymentSucceeded = true;
        try { checkout?.close?.(); } catch (error) { /* older checkout versions */ }
        completeBooking(response.transaction_id);
      } else {
        setBusy(false);
        showError('Payment was not completed. Please try again, or');
      }
    },
    onclose: () => {
      if (paymentSucceeded) return;
      setBusy(false);
      openBooking({}, lastOpener);
      if (!status.textContent) status.textContent = 'Checkout closed. Your details are still here.';
    }
  });
});

// Lets other components (e.g. the event promo) open the form with details filled in.
window.SuburbBooking = { open: (preset) => openBooking(preset, document.activeElement) };
