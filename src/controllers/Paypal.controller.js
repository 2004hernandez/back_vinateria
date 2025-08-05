// src/controllers/Paypal.controller.js
import { PrismaClient } from "@prisma/client";
import paypal from "@paypal/checkout-server-sdk";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

// Configurar cliente de PayPal (Sandbox o Live según entorno)
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

/**
 * Crear orden de pago en PayPal
 * Recibe en el body: { items: [{ id, name, price, quantity }], total }
 * Requiere req.userId
 */

export const obtenerCostoEnvio = async ({ num_productos, num_items_total, tamano_total_ml, precio_unitario_prom }) => {
  try {
    const params = new URLSearchParams({
      num_productos: num_productos.toString(),
      num_items_total: num_items_total.toString(),
      tamano_total_ml: tamano_total_ml.toString(),
      precio_unitario_prom: precio_unitario_prom.toString(),
    });

    const response = await fetch(`https://vinateria-envios.bwet7p.easypanel.host/predecir-envio?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.costo_envio_estimado;
  } catch (error) {
    console.error("❌ Error al obtener costo de envío:", error.message);
    return null;
  }
};

export const crearOrdenPaypal = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const { items, total } = req.body;

    if (!items || !Array.isArray(items) || typeof total !== "number") {
      return res.status(400).json({ success: false, message: "Datos inválidos de orden" });
    }

    // 1. Calcular subtotal con precisión
    const subtotal = parseFloat(
      items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)
    );

    // 2. Calcular datos para el modelo de predicción
    const num_productos = items.length;
    const num_items_total = items.reduce((sum, i) => sum + i.quantity, 0);
    const tamano_total_ml = items.reduce(
      (sum, i) => sum + ((i.size_ml ?? 750) * i.quantity),
      0
    );
    const precio_unitario_prom = parseFloat((subtotal / num_items_total).toFixed(2));

    // 3. Calcular costo de envío (con envío gratis si aplica)
    let shipping = 0;
    if (subtotal < 500) {
      shipping = await obtenerCostoEnvio({
        num_productos,
        num_items_total,
        tamano_total_ml,
        precio_unitario_prom,
      });

      if (shipping === null) {
        return res.status(500).json({
          success: false,
          message: "Error al obtener el costo de envío",
        });
      }

      shipping = parseFloat(shipping.toFixed(2));
    }

    const expectedTotal = parseFloat((subtotal + shipping).toFixed(2));

    // 4. Validar total
    if (Math.abs(expectedTotal - total) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "Total no coincide con la suma de productos + envío",
      });
    }

    // 5. Crear orden en PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: total.toFixed(2),
            breakdown: {
              item_total: { currency_code: "USD", value: subtotal.toFixed(2) },
              shipping: { currency_code: "USD", value: shipping.toFixed(2) },
            },
          },
          items: items.map((i) => ({
            name: i.name,
            unit_amount: {
              currency_code: "USD",
              value: i.price.toFixed(2),
            },
            quantity: i.quantity.toString(),
            sku: i.id.toString(),
          })),
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL}/pago-exitoso`,
        cancel_url: `${process.env.FRONTEND_URL}/carrito`,
      },
    });

    const order = await paypalClient.execute(request);
    return res.status(200).json({ success: true, orderId: order.result.id });
  } catch (error) {
    console.error("Error al crear orden PayPal:", error);
    return res.status(500).json({
      success: false,
      message: "Error creando orden PayPal",
      error: error.message,
    });
  }
};


/**
 * Capturar y procesar orden PayPal
 * Recibe en body: { orderId }
 * Requiere req.userId
 */
export const capturarOrdenPaypal = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const { orderId } = req.body;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "orderId es requerido" });
    }

    // 1) Capturar el pago
    const captureReq = new paypal.orders.OrdersCaptureRequest(orderId);
    captureReq.requestBody({});
    const capture = await paypalClient.execute(captureReq);

    // 2) Extraer monto real capturado
    const pu = capture.result.purchase_units?.[0];
    let capturedValue =
      parseFloat(
        pu.payments?.captures?.[0]?.amount?.value ||
          pu.amount?.value ||
          "0"
      );
    if (isNaN(capturedValue)) {
      throw new Error("Monto inválido en respuesta de PayPal");
    }

    // 3) Obtener carrito y hacer la transacción
    const carritoItems = await prisma.carrito.findMany({
      where: { usuarioId },
      include: { producto: true },
    });
    if (!carritoItems.length) {
      return res
        .status(404)
        .json({ success: false, message: "Carrito vacío o no encontrado" });
    }

    // 4) Crear pedido en DB y registrar ventas, actualizar stock, vaciar carrito
    const nuevoPedido = await prisma.$transaction(async (tx) => {
      // Crear pedido maestro
      const pedido = await tx.pedidos.create({
        data: {
          usuarioId,
          fecha_pedido: new Date(),
          estado: "EN_PROCESO",
          total: capturedValue,
          detallePedido: {
            create: carritoItems.map((ci) => ({
              productoId: ci.productoId,
              cantidad: ci.cantidad,
              precio_unitario: ci.producto.precio,
            })),
          },
        },
      });

      // Registrar en Sales
      for (const ci of carritoItems) {
        await tx.sales.create({
          data: {
            productoId: ci.productoId,
            usuarioId,
            cantidad: ci.cantidad,
            precioUnitario: ci.producto.precio,
            total: ci.producto.precio * ci.cantidad,
          },
        });
      }

      // Decrementar stock
      for (const ci of carritoItems) {
        await tx.productos.update({
          where: { id: ci.productoId },
          data: { stock: { decrement: ci.cantidad } },
        });
      }

      // Vaciar carrito
      await tx.carrito.deleteMany({ where: { usuarioId } });

      return pedido;
    });

    res.status(200).json({
      success: true,
      pedidoId: nuevoPedido.id,
      orderId,
      total: capturedValue,
    });
  } catch (error) {
    console.error("Error al capturar orden PayPal:", error);
    res.status(500).json({
      success: false,
      message: "Error al procesar pago",
      error: error.message,
    });
  }
};
