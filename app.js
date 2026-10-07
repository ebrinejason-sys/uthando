const site = window.SUBURB_RIDES;
const $ = (selector) => document.querySelector(selector);

const form = $('#bookingForm');
const pickupType = $('#pickupType');
const returnRide = $('#returnRide');
const paymentMethod = $('#paymentMethod');
const seats = $('#seats');
const rideDate = $('#rideDate');
const emailField = $('#emailField');
const emailInput = $('#email');
const total = $('#total');
const status = $('#status');
const submitButton = $('#submitButton');
const confirmationDialog = $('#confirmationDialog');
const bookingNumber = $('#bookingNumber');
const bookingSummary = $('#bookingSummary');
const whatsappConfirm = $('#whatsappConfirm');
const confirmationLabel = $('#confirmationLabel');
const dialogCopy = $('#dialogCopy');
let flutterwavePublicKey = '';

fetch('/api/config')
  .then((response) => (response.ok ? response.json() : {}))
  .then((config) => { flutterwavePublicKey = config.flutterwavePublicKey || ''; })
  .catch(() => {});

const formatUGX = (value) => `UGX ${Number(value || 0).toLocaleString('en-US')}`;

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
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function calculateAmount() {
  const price = Number(pickupType.value || 0);
  const count = Number(seats.value || 1);
  return price * count * (returnRide.value === 'yes' ? 2 : 1);
}

function updateTotal() {
  total.textContent = formatUGX(calculateAmount());
}

function updatePaymentFields() {
  const needsEmail = paymentMethod.value === 'flutterwave';
  emailField.hidden = !needsEmail;
  emailInput.required = needsEmail;
  submitButton.firstChild.textContent = needsEmail ? 'Continue to payment ' : 'Book my ride ';
}

rideDate.min = todayISO();
[pickupType, returnRide, seats].forEach((field) => field.addEventListener('change', updateTotal));
paymentMethod.addEventListener('change', updatePaymentFields);
form.addEventListener('input', (event) => event.target.removeAttribute('aria-invalid'));
updateTotal();
updatePaymentFields();

// Service cards open WhatsApp with a ready-made quote request.
document.querySelectorAll('[data-service]').forEach((card) => {
  card.href = site.whatsappLink(`Hello ${site.brand}, I would like a quote for ${card.dataset.service}.\nDate:\nPickup:\nDestination:\nNumber of people:`);
});

const closeConfirmation = () => confirmationDialog.close();
$('#dialogClose').addEventListener('click', closeConfirmation);
$('#dialogDone').addEventListener('click', closeConfirmation);

function buildWhatsAppMessage(data, booking) {
  const paid = data.paymentMethod === 'flutterwave';
  const pickupLabel = pickupType.selectedOptions[0]?.textContent || '';
  return [
    `Hello ${site.brand}, I am confirming my booking.`,
    '',
    `Booking no: ${booking.bookingNumber}`,
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Pickup area: ${data.area}`,
    `Pickup type: ${pickupLabel}`,
    `Pickup point/address: ${data.address}`,
    `Destination: ${data.destination}`,
    `Date: ${formatDate(data.rideDate)}`,
    `Pickup time: ${formatTime(data.pickupTime)}`,
    `Return ride: ${data.returnRide === 'yes' ? 'Yes' : 'No'}`,
    `Seats: ${data.seats}`,
    `Total: UGX ${booking.amount}`,
    `Payment: ${paid ? `Mobile money, PAID (Flutterwave ID ${booking.transactionId})` : 'Cash on pickup'}`
  ].join('\n');
}

function validate(data) {
  const required = ['name', 'phone', 'area', 'pickupType', 'address', 'destination', 'rideDate', 'pickupTime', 'returnRide', 'paymentMethod'];
  if (data.paymentMethod === 'flutterwave') required.push('email');
  const missing = required.filter((key) => !String(data[key] || '').trim());
  if (data.email && data.paymentMethod === 'flutterwave' && !emailInput.checkValidity()) missing.push('email');
  missing.forEach((key) => form.elements[key]?.setAttribute('aria-invalid', 'true'));
  if (missing.length) form.elements[missing[0]]?.focus();
  return missing.length === 0;
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
}

function showConfirmation(data, booking) {
  const message = buildWhatsAppMessage(data, booking);
  const link = site.whatsappLink(message);
  const paid = data.paymentMethod === 'flutterwave';

  bookingNumber.textContent = booking.bookingNumber;
  bookingSummary.textContent = `${data.area} → ${data.destination} · ${formatDate(data.rideDate)}, ${formatTime(data.pickupTime)} · ${data.seats} seat(s) · UGX ${booking.amount}`;
  confirmationLabel.textContent = paid ? 'Payment received' : 'Booking saved';
  dialogCopy.innerHTML = paid
    ? `Your mobile money payment went through. Your ride is confirmed once you send the booking to us on WhatsApp at <b>${site.phoneDisplay}</b>.`
    : `Your ride is confirmed once you send the booking to us on WhatsApp at <b>${site.phoneDisplay}</b>. Pay your driver <b>UGX ${booking.amount}</b> in cash at pickup.`;
  whatsappConfirm.href = link;

  status.className = 'status success';
  status.innerHTML = '';
  status.append(`Booking ${booking.bookingNumber} saved. It is confirmed once you send it on WhatsApp. `);
  const statusLink = document.createElement('a');
  statusLink.href = link;
  statusLink.target = '_blank';
  statusLink.rel = 'noopener noreferrer';
  statusLink.textContent = 'Confirm on WhatsApp ↗';
  status.append(statusLink);

  confirmationDialog.showModal();
  form.reset();
  updateTotal();
  updatePaymentFields();
}

function showError(text) {
  status.className = 'status error';
  status.innerHTML = '';
  status.append(`${text} `);
  const link = document.createElement('a');
  link.href = site.whatsappLink(`Hello ${site.brand}, I need help booking a ride.`);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = `WhatsApp us on ${site.phoneDisplay} ↗`;
  status.append(link);
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

  const amount = calculateAmount();
  const reference = `SR-${Date.now()}`;
  const booking = { ...data, pickupLabel: pickupType.selectedOptions[0]?.textContent || '' };
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
    .catch(() => showError('We could not complete your booking.'))
    .finally(() => setBusy(false));

  if (data.paymentMethod === 'cash') {
    status.textContent = 'Saving your booking...';
    completeBooking();
    return;
  }

  const config = {
    public_key: flutterwavePublicKey,
    tx_ref: reference,
    amount,
    currency: 'UGX',
    payment_options: 'mobilemoneyuganda',
    customer: { email: data.email, phone_number: data.phone, name: data.name },
    meta: { area: data.area, destination: data.destination, ride_date: data.rideDate, pickup_time: data.pickupTime, seats: data.seats },
    customizations: { title: `${site.brand} ride`, description: `${data.seats} seat(s) from ${data.area} to ${data.destination}, ${formatDate(data.rideDate)} ${formatTime(data.pickupTime)}`, logo: '' },
    callback: (response) => {
      if (response.status === 'successful') {
        status.className = 'status';
        status.textContent = 'Payment received. Verifying your booking...';
        completeBooking(response.transaction_id);
      } else {
        setBusy(false);
        showError('Payment was not completed. Please try again, or');
      }
    },
    onclose: () => {
      setBusy(false);
      if (!status.textContent) status.textContent = 'Checkout closed. Your details are still here.';
    }
  };

  if (window.FlutterwaveCheckout && config.public_key && !config.public_key.includes('REPLACE_WITH')) {
    window.FlutterwaveCheckout(config);
    return;
  }

  setBusy(false);
  showError('Mobile money is not available right now. Please choose cash on pickup, or');
});
