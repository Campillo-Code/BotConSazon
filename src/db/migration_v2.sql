-- Actualizar tabla whatsapp_pedidos
ALTER TABLE whatsapp_pedidos ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'pedido' AFTER notas;
ALTER TABLE whatsapp_pedidos ADD COLUMN motivo_cancelacion TEXT NULL AFTER estado;
ALTER TABLE whatsapp_pedidos ADD COLUMN fecha_entrega DATE NULL AFTER motivo_cancelacion;
