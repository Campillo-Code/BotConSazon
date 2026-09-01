// Test con el ContentSid correcto
require('dotenv').config();
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function test() {
  try {
    const msg = await client.messages.create({
      contentSid: 'HX7cf5a23fe00549e2ed931e272889fb49',
      from: 'whatsapp:+4915888620339',
      to: 'whatsapp:+34644908669',
    });
    console.log('OK:', msg.sid);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
