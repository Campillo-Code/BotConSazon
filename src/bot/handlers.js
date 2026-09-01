const db = require('../db/connection');

// Estados de conversación por usuario
const conversaciones = new Map();

function getConv(telefono) {
  if (!conversaciones.has(telefono)) {
    conversaciones.set(telefono, { paso: 'inicio', pedido: [], categoriaActual: null });
  }
  return conversaciones.get(telefono);
}

function resetConv(telefono) {
  conversaciones.delete(telefono);
}

async function getMenuMessage() {
  const categorias = await db.getCategorias();
  let msg = '🍽️ *Menú de Con Sazón*\n\n';
  msg += 'Selecciona una categoría:\n\n';
  for (const cat of categorias) {
    const platos = await db.getPlatosPorCategoria(cat.id);
    msg += `*${cat.nombre}* — ${Number(cat.precio).toFixed(2)} €`;
    if (cat.plus > 0) msg += ` (+${Number(cat.plus).toFixed(2)} € plus)`;
    msg += '\n';
    for (const p of platos) {
      msg += `  • ${p.nombre}\n`;
    }
    msg += '\n';
  }
  msg += 'Escribe el nombre del plato que quieres pedir.';
  return msg;
}

async function handleMensaje(telefono, texto) {
  const conv = getConv(telefono);
  const lower = texto.toLowerCase().trim();

  // Comandos globales
  if (lower === 'menú' || lower === 'menu' || lower === 'ver menu') {
    conv.paso = 'seleccionando_plato';
    return { respuesta: await getMenuMessage(), tipo: 'menu' };
  }

  if (lower === 'cancelar' || lower === 'volver') {
    if (conv.pedido.length > 0) {
      conv.pedido = [];
      conv.paso = 'inicio';
      return { respuesta: '❌ Pedido cancelado. Escribe "menu" para empezar de nuevo.', tipo: 'pedido' };
    }
    conv.paso = 'inicio';
    return { respuesta: 'Escribe "menu" para ver el menú.', tipo: 'bienvenida' };
  }

  if (lower === 'finalizar' || lower === 'confirmar') {
    if (conv.pedido.length === 0) {
      return { respuesta: 'No tienes nada en el pedido. Escribe "menu" para ver el menú.', tipo: 'bienvenida' };
    }
    return { respuesta: await finalizarPedido(telefono, conv), tipo: 'pedido' };
  }

  if (lower === 'pedir') {
    conv.paso = 'seleccionando_plato';
    return { respuesta: await getMenuMessage(), tipo: 'menu' };
  }

  // Flujo según paso
  switch (conv.paso) {
    case 'inicio':
      return { respuesta: '¡Hola! 👋 Bienvenido a *Con Sazón*.\n\nEscribe "menu" para ver nuestra carta y hacer tu pedido.', tipo: 'bienvenida' };

    case 'seleccionando_plato': {
      const todosPlatos = await db.getTodosPlatos();
      const plato = todosPlatos.find(p => p.nombre.toLowerCase() === lower);
      if (!plato) {
        // Buscar coincidencia parcial
        const parcial = todosPlatos.find(p => p.nombre.toLowerCase().includes(lower));
        if (parcial) {
          conv.platoSeleccionado = parcial;
          conv.paso = 'confirmando_plato';
          let msg = `¿*${parcial.nombre}*? (${parcial.categoria_nombre})\n\n`;
          msg += '1️⃣ Añadir al pedido\n2️⃣ Volver al menú\n\nResponde con 1 o 2.';
          return { respuesta: msg, tipo: 'menu' };
        }
        return { respuesta: `No encontré "${texto}". Escribe "menu" para ver las opciones disponibles.`, tipo: 'bienvenida' };
      }
      conv.platoSeleccionado = plato;
      conv.paso = 'confirmando_plato';
      let msg2 = `¿*${plato.nombre}*? (${plato.categoria_nombre})\n\n`;
      msg2 += '1️⃣ Añadir al pedido\n2️⃣ Volver al menú\n\nResponde con 1 o 2.';
      return { respuesta: msg2, tipo: 'menu' };
    }

    case 'confirmando_plato': {
      if (lower === '1' || lower === 'añadir' || lower === 'agregar') {
        const plato = conv.platoSeleccionado;
        // Buscar precio de la categoría
        const cats = await db.getCategorias();
        const cat = cats.find(c => c.id === plato.categoria_id);
        const precio = cat ? Number(cat.precio) : 0;

        conv.pedido.push({
          nombre: plato.nombre,
          categoria: cat?.nombre || '',
          precio,
          cantidad: 1,
        });

        conv.paso = 'seleccionando_plato';
        let msg = `✅ *${plato.nombre}* añadido (${precio.toFixed(2)} €)\n\n`;
        msg += `🛒 *Pedido actual:* ${conv.pedido.length} artículo(s)\n`;
        for (const item of conv.pedido) {
          msg += `  • ${item.nombre} — ${item.precio.toFixed(2)} €\n`;
        }
        const total = conv.pedido.reduce((s, i) => s + i.precio * i.cantidad, 0);
        msg += `\n💰 *Total: ${total.toFixed(2)} €*\n\n`;
        msg += 'Escribe otro plato, o "finalizar" para confirmar el pedido.';
        return { respuesta: msg, tipo: 'pedido' };
      }
      if (lower === '2' || lower === 'volver') {
        conv.paso = 'seleccionando_plato';
        return { respuesta: await getMenuMessage(), tipo: 'menu' };
      }
      return { respuesta: 'Responde con 1 (añadir) o 2 (volver).', tipo: 'menu' };
    }

    default:
      conv.paso = 'inicio';
      return { respuesta: 'Escribe "menu" para ver el menú.', tipo: 'bienvenida' };
  }
}

async function finalizarPedido(telefono, conv) {
  const total = conv.pedido.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const pedidoId = await db.crearPedido({
    telefono,
    nombre: null,
    items: conv.pedido,
    total,
    notas: null,
  });

  let msg = `✅ *¡Pedido #${pedidoId} confirmado!*\n\n`;
  for (const item of conv.pedido) {
    msg += `• ${item.nombre} — ${item.precio.toFixed(2)} €\n`;
  }
  msg += `\n💰 *Total: ${total.toFixed(2)} €*\n\n`;
  msg += 'Te confirmaremos cuando esté listo. ¡Gracias! 🙏';

  conv.pedido = [];
  conv.paso = 'inicio';
  return msg;
}

module.exports = { handleMensaje };
