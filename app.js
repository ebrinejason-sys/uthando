const form = document.querySelector('#bookingForm');
const pickupType = document.querySelector('#pickupType');
const seats = document.querySelector('#seats');
const total = document.querySelector('#total');
const status = document.querySelector('#status');
let flutterwavePublicKey = '';

fetch('/api/config')
  .then((response) => response.ok ? response.json() : {})
  .then((config) => { flutterwavePublicKey = config.flutterwavePublicKey || ''; })
  .catch(() => {});

function updateTotal() {
  const price = Number(pickupType.value || 0);
  const count = Number(seats.value || 1);
  total.textContent = `UGX ${(price * count).toLocaleString('en-US')}`;
}

pickupType.addEventListener('change', updateTotal);
seats.addEventListener('change', updateTotal);
updateTotal();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.className = 'status';
  status.textContent = '';

  const price = Number(pickupType.value);
  const count = Number(seats.value);
  const data = Object.fromEntries(new FormData(form));
  const amount = price * count;
  const reference = `UV-${Date.now()}`;

  if (!price || !data.name || !data.phone || !data.area || !data.address) {
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
    customer: { email: `${data.phone.replace(/\D/g, '')}@uthandovibes.com`, phone_number: data.phone, name: data.name },
    customizations: { title: 'Uthando Vibes transport', description: `${count} seat(s) from ${data.area}`, logo: '' },
    callback: (response) => {
      if (response.status === 'successful') {
        status.className = 'status success';
        status.textContent = `Payment received. Your ride reference is ${reference}.`;
        form.reset();
        updateTotal();
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

  const message = encodeURIComponent(`Hello Uthando Vibes, I want to book ${count} seat(s). Name: ${data.name}. Phone: ${data.phone}. Area: ${data.area}. Pickup: ${data.address}. Total: UGX ${amount.toLocaleString('en-US')}.`);
  status.className = 'status success';
  status.innerHTML = `Booking details ready. <a href="https://wa.me/256785896760?text=${message}" target="_blank" rel="noreferrer">Confirm via WhatsApp ↗</a>`;
});
