const form = document.querySelector('#bookingForm');
const pickupType = document.querySelector('#pickupType');
const returnRide = document.querySelector('#returnRide');
const paymentMethod = document.querySelector('#paymentMethod');
const seats = document.querySelector('#seats');
const total = document.querySelector('#total');
const status = document.querySelector('#status');
const confirmationDialog = document.querySelector('#confirmationDialog');
const bookingNumber = document.querySelector('#bookingNumber');
const whatsappConfirm = document.querySelector('#whatsappConfirm');
const dialogClose = document.querySelector('#dialogClose');
const dialogDone = document.querySelector('#dialogDone');
const confirmationLabel = document.querySelector('#confirmationLabel');
const dialogCopy = document.querySelector('#dialogCopy');
const whatsappGroupUrl = 'https://chat.whatsapp.com/FsJ1LNbmt4TAN0kFB3gy8s?s=cl&p=i&mlu=4&ilr=4';
let flutterwavePublicKey = '';

fetch('/api/config')
  .then((response) => response.ok ? response.json() : {})
  .then((config) => { flutterwavePublicKey = config.flutterwavePublicKey || ''; })
  .catch(() => {});

function updateTotal() {
  const price = Number(pickupType.value || 0);
  const count = Number(seats.value || 1);
  const tripMultiplier = returnRide.value === 'yes' ? 2 : 1;
  total.textContent = `UGX ${(price * count * tripMultiplier).toLocaleString('en-US')}`;
}

pickupType.addEventListener('change', updateTotal);
returnRide.addEventListener('change', updateTotal);
seats.addEventListener('change', updateTotal);
updateTotal();

function closeConfirmation() {
  confirmationDialog.close();
}

dialogClose.addEventListener('click', closeConfirmation);
dialogDone.addEventListener('click', closeConfirmation);
whatsappConfirm.addEventListener('click', async (event) => {
  const message = whatsappConfirm.dataset.message;
  if (!message) return;
  event.preventDefault();
  try {
    await navigator.clipboard.writeText(message);
    status.className = 'status success';
    status.textContent = 'Booking message copied. Paste it into the WhatsApp group.';
  } catch (error) {
    status.className = 'status';
  }
  window.open(whatsappGroupUrl, '_blank', 'noopener');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.className = 'status';
  status.textContent = '';

  const price = Number(pickupType.value);
  const count = Number(seats.value);
  const data = Object.fromEntries(new FormData(form));
  const amount = price * count * (data.returnRide === 'yes' ? 2 : 1);
  const reference = `UV-${Date.now()}`;

  if (!price || !data.name || !data.phone || !data.email || !data.area || !data.address || !data.paymentMethod) {
    status.className = 'status error';
    status.textContent = 'Please complete all required ride details.';
    return;
  }

  const completeBooking = (transactionId = null) => fetch('/api/complete-booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, expectedAmount: amount, paymentMethod: data.paymentMethod, booking: data })
  })
    .then((result) => result.json().then((body) => ({ ok: result.ok, body })))
    .then(({ ok, body }) => {
      if (!ok) throw new Error(body.error || 'Booking failed');
      const message = `Hello Uthando Vibes, I am confirming my ${data.paymentMethod === 'cash' ? 'cash' : 'paid'} booking ${body.bookingNumber}. Name: ${data.name}. Phone: ${data.phone}. Station: ${data.area}. Pickup: ${data.address}. Time: ${data.pickupTime}. Return ride: ${data.returnRide}. Seats: ${count}.`;
      status.className = 'status success';
      bookingNumber.textContent = body.bookingNumber;
      confirmationLabel.textContent = data.paymentMethod === 'cash' ? 'Cash booking received' : 'Payment confirmed';
      dialogCopy.textContent = data.paymentMethod === 'cash' ? 'Keep this booking number safe. Pay your driver in cash when you are picked up.' : 'Keep this booking number safe. We have sent the same number to your email.';
      whatsappConfirm.href = whatsappGroupUrl;
      whatsappConfirm.dataset.message = message;
      confirmationDialog.showModal();
      status.textContent = `Booking ${body.bookingNumber} confirmed.`;
      form.reset();
      updateTotal();
    })
    .catch(() => {
      status.className = 'status error';
      status.textContent = 'We could not complete your booking. Please contact us on WhatsApp.';
    });

  if (data.paymentMethod === 'cash') {
    status.textContent = 'Saving your cash booking...';
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
    customizations: { title: 'Uthando Vibes transport', description: `${count} seat(s) from ${data.area}, pickup at ${data.pickupTime}`, logo: '' },
    callback: (response) => {
      if (response.status === 'successful') {
        status.className = 'status';
        status.textContent = 'Payment received. Verifying your booking...';
        completeBooking(response.transaction_id);
      } else {
        status.className = 'status error';
        status.textContent = 'Payment was not completed. Please try again.';
      }
    },
    onclose: () => {
      if (!status.textContent) status.textContent = 'Checkout closed. Your details are still here.';
    }
  };

  if (window.FlutterwaveCheckout && !config.public_key.includes('REPLACE_WITH')) {
    window.FlutterwaveCheckout(config);
    return;
  }

  status.className = 'status error';
  status.innerHTML = 'Online payment is not configured yet. <a href="https://chat.whatsapp.com/FsJ1LNbmt4TAN0kFB3gy8s?s=cl&amp;p=i&amp;mlu=4&amp;ilr=4" target="_blank" rel="noreferrer">Join the WhatsApp group ↗</a>';
});
