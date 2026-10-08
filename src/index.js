const express = require('express');
const { handleMensaje } = require('./bot/handlers');
const db = require('./db/connection');
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
    // Guardar mensaje entrante
    await db.guardarMensaje(telefono, mensaje, 'in');

    const { respuesta } = await handleMensaje(telefono, mensaje);
    console.log(`[WhatsApp] Respuesta: "${respuesta.substring(0, 80)}..."`);

    // Guardar mensaje saliente
    await db.guardarMensaje(telefono, respuesta, 'out');

    // Mensaje libre (sesión) — el cliente siempre escribe primero
    await client.messages.create({
      body: respuesta,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: telefono,
    });

    console.log(`[WhatsApp] Mensaje enviado`);
    res.status(200).send('');
  } catch (e) {
    console.error('[Error]', e.message);
    res.status(500).send('');
  }
});

app.post('/send', async (req, res) => {
  const { telefono, mensaje } = req.body;
  if (!telefono || !mensaje) {
    return res.status(400).json({ error: 'telefono y mensaje requeridos' });
  }
  try {
    await client.messages.create({
      body: mensaje,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: telefono,
    });
    await db.guardarMensaje(telefono, mensaje, 'manual_out');
    res.json({ ok: true });
  } catch (e) {
    console.error('[Send Error]', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Bot] Puerto ${PORT}`);
});
