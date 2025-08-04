// src/controllers/Shipping.controller.js
import { obtenerCostoEnvio } from "./Paypal.controller.js"; // Ya existente

export const calcularCostoEnvio = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de items",
      });
    }

    // Calcular subtotal y características necesarias
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const num_productos = items.length;
    const num_items_total = items.reduce((sum, item) => sum + item.quantity, 0);
    const tamano_total_ml = items.reduce((sum, item) => sum + item.size_ml * item.quantity, 0);
    const precio_unitario_prom = parseFloat((subtotal / num_items_total).toFixed(2));

    // Llamar a microservicio de predicción
    const costo_envio = await obtenerCostoEnvio({
      num_productos,
      num_items_total,
      tamano_total_ml,
      precio_unitario_prom,
    });

    console.log({
      num_productos,
      num_items_total,
      tamano_total_ml,
      precio_unitario_prom,
    });


    if (costo_envio === null) {
      return res.status(500).json({
        success: false,
        message: "Error al calcular costo de envío",
      });
    }

    const total = parseFloat((subtotal + costo_envio).toFixed(2));

    return res.status(200).json({
      success: true,
      resumen: {
        num_productos,
        num_items_total,
        tamano_total_ml,
        precio_unitario_prom,
      },
      calculo: {
        subtotal,
        costo_envio,
        total
      }
    });
  } catch (error) {
    console.error("❌ Error en calcularCostoEnvio:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno al calcular el costo de envío",
    });
  }
};
