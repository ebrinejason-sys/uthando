module.exports = (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || ''
  });
};
