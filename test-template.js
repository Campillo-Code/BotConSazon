// Test sin plantilla - solo body
require('dotenv').config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function test() {
  try {
    const msg = await client.messages.create({
      from: 'whatsapp:+4915888620339',
      to: 'whatsapp:+34644908669',
      body: 'Test directo desde el bot',
    });
    console.log('OK:', msg.sid);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
