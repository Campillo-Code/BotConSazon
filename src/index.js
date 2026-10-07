const express = require('express');
const { handleMensaje } = require('./bot/handlers');
require('dotenv').config();
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const telefono = req.body.From || '';
  const mensaje = req.body.Body || '';

  console.log(`[WhatsApp] De: ${telefono} | Mensaje: "${mensaje}"`);

  try {
    const { respuesta } = await handleMensaje(telefono, mensaje);
    console.log(`[WhatsApp] Respuesta: "${respuesta.substring(0, 80)}..."`);

    // Mensaje libre (sesión) — el cliente siempre escribe primero
    await client.messages.create({
      body: respuesta,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: telefono,
    });

    console.log(`[WhatsApp] Mensaje enviado`);
    res.sendStatus(200);
  } catch (e) {
    console.error('[Error]', e.message);
    res.sendStatus(500);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Bot] Puerto ${PORT}`);
});
