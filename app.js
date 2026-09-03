const form = document.querySelector('#bookingForm');
const pickupType = document.querySelector('#pickupType');
const returnRide = document.querySelector('#returnRide');
const seats = document.querySelector('#seats');
const total = document.querySelector('#total');
const status = document.querySelector('#status');
const confirmationDialog = document.querySelector('#confirmationDialog');
const bookingNumber = document.querySelector('#bookingNumber');
const whatsappConfirm = document.querySelector('#whatsappConfirm');
const dialogClose = document.querySelector('#dialogClose');
const dialogDone = document.querySelector('#dialogDone');
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

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.className = 'status';
  status.textContent = '';

  const price = Number(pickupType.value);
  const count = Number(seats.value);
  const data = Object.fromEntries(new FormData(form));
  const amount = price * count * (data.returnRide === 'yes' ? 2 : 1);
  const reference = `UV-${Date.now()}`;

  if (!price || !data.name || !data.phone || !data.email || !data.area || !data.address) {
    status.className = 'status error';
    status.textContent = 'Please complete all required ride details.';
    return;
  }

  const config = {
    public_key: flutterwavePublicKey,
    tx_ref: reference,
    amount,
    currency: 'UGX',
    payment_options: 'card,mobilemoneyuganda,mobilemoneyrwanda,mobilemoneyzambia',
    customer: { email: data.email, phone_number: data.phone, name: data.name },
    customizations: { title: 'Uthando Vibes transport', description: `${count} seat(s) from ${data.area}, pickup at ${data.pickupTime}`, logo: '' },
    callback: (response) => {
      if (response.status === 'successful') {
        status.className = 'status';
        status.textContent = 'Payment received. Verifying your booking...';
        fetch('/api/complete-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: response.transaction_id, expectedAmount: amount, booking: data })
        })
          .then((result) => result.json().then((body) => ({ ok: result.ok, body })))
          .then(({ ok, body }) => {
            if (!ok) throw new Error(body.error || 'Verification failed');
            const message = encodeURIComponent(`Hello Uthando Vibes, I am confirming my paid booking ${body.bookingNumber}. Name: ${data.name}. Phone: ${data.phone}. Station: ${data.area}. Pickup: ${data.address}. Time: ${data.pickupTime}. Return ride: ${data.returnRide}. Seats: ${count}.`);
            status.className = 'status success';
            bookingNumber.textContent = body.bookingNumber;
            whatsappConfirm.href = `https://wa.me/256785896760?text=${message}`;
            confirmationDialog.showModal();
            status.textContent = `Booking ${body.bookingNumber} confirmed.`;
            form.reset();
            updateTotal();
          })
          .catch(() => {
            status.className = 'status error';
            status.textContent = 'Payment was received, but verification is still pending. Please contact us on WhatsApp.';
          });
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
  status.innerHTML = 'Online payment is not configured yet. <a href="https://wa.me/256785896760" target="_blank" rel="noreferrer">Contact us on WhatsApp ↗</a>';
});
