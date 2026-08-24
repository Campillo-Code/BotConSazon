const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const { handleMensaje } = require('./bot/handlers');
require('dotenv').config();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Webhook de Twilio - recibe mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
  const telefono = req.body.From || '';
  const mensaje = req.body.Body || '';

  console.log(`[WhatsApp] De: ${telefono} | Mensaje: "${mensaje}"`);

  try {
    const respuesta = await handleMensaje(telefono, mensaje);

    const twiml = new MessagingResponse();
    twiml.message(respuesta);

    res.type('text/xml').send(twiml.toString());
  } catch (e) {
    console.error('[Error]', e);
    const twiml = new MessagingResponse();
    twiml.message('Lo siento, ha habido un error. Inténtalo de nuevo.');
    res.type('text/xml').send(twiml.toString());
  }
});

// Endpoint para verificar que el servidor está vivo
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Bot] Servidor escuchando en puerto ${PORT}`);
  console.log(`[Bot] Webhook: http://localhost:${PORT}/webhook`);
});
