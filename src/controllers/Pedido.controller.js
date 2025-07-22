import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const crearPedido = async (req, res) => {
  try {
    const usuarioId = req.userId;

    // 1. Traer items del carrito
    const carritoItems = await prisma.Carrito.findMany({
      where: { usuarioId },
      include: { producto: true }
    });
    if (carritoItems.length === 0) {
      return res.status(400).json({ message: "Tu carrito está vacío" });
    }

    // 2. Verificar stock y preparar detalles
    let total = 0;
    for (const item of carritoItems) {
      if (item.producto.stock < item.cantidad) {
        return res.status(400).json({
          message: `No hay suficiente stock de "${item.producto.name}". Disponibles: ${item.producto.stock}`
        });
      }
      total += item.cantidad * item.producto.precio;
    }
    const detalleData = carritoItems.map(item => ({
      productoId:      item.productoId,
      cantidad:        item.cantidad,
      precio_unitario: item.producto.precio
    }));

    // 3. Transacción: crear pedido, detalle, registrar ventas, actualizar stock, limpiar carrito
    const nuevoPedido = await prisma.$transaction(async (tx) => {
      // 3.1 Crear pedido maestro
      const pedido = await tx.Pedidos.create({
        data: {
          usuarioId,
          fecha_pedido: new Date(),
          estado: "RECIBIDO",
          total
        }
      });

      // 3.2 Crear detalle del pedido
      const detallesConPedido = detalleData.map(d => ({
        ...d,
        pedidoId: pedido.id
      }));
      await tx.Detalle_Pedido.createMany({ data: detallesConPedido });

      // 3.3 Registrar cada línea como venta en Sales
      const ventasData = detalleData.map(d => ({
        productoId:     d.productoId,
        usuarioId,                          // misma variable
        fechaVenta:     new Date(),
        cantidad:       d.cantidad,
        precioUnitario: d.precio_unitario,
        total:          d.precio_unitario * d.cantidad
      }));
      await tx.Sales.createMany({ data: ventasData });

      // 3.4 Decrementar stock de cada producto
      for (const { productoId, cantidad } of detalleData) {
        await tx.Productos.update({
          where: { id: productoId },
          data: { stock: { decrement: cantidad } }
        });
      }

      // 3.5 Vaciar carrito del usuario
      await tx.Carrito.deleteMany({ where: { usuarioId } });

      return pedido;
    });

    return res.status(201).json({ pedido: nuevoPedido });
  } catch (error) {
    console.error("Error creando pedido:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};



// 1.1 Obtener todos los pedidos (solo admin), opcionalmente filtrados por usuario
export const obtenerPedidosAdmin = async (req, res) => {
  try {
    // Leer el query param
    const filtroUsuario = req.query.usuarioId
      ? Number(req.query.usuarioId)
      : undefined;

    // Construir cláusula WHERE
    const where = filtroUsuario
      ? { usuarioId: filtroUsuario }
      : {};

    const pedidos = await prisma.Pedidos.findMany({
      where,
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        detallePedido: { include: { producto: true } },
      },
      orderBy: { fecha_pedido: "desc" },
    });
    return res.json({ pedidos });
  } catch (error) {
    console.error("Error obteniendo pedidos:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// 1.3 Obtener pedidos de un usuario por email
export const 
obtenerPedidosPorEmail = async (req, res) => {
  try {
    const { email } = req.params; // o req.query.email, según tu ruta

    // 1. Buscar usuario por email
    const usuario = await prisma.Usuarios.findUnique({
      where: { email }
    });
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // 2. Traer sus pedidos con detalles y producto
    const pedidos = await prisma.Pedidos.findMany({
      where: { usuarioId: usuario.id },
      include: {
        detallePedido: {
          include: { producto: true }
        },
        // opcional: si quieres repetir datos básicos del usuario en cada pedido
        usuario: { select: { id: true, name: true, email: true } }
      },
      orderBy: { fecha_pedido: "desc" }
    });

    return res.json({ pedidos });
  } catch (error) {
    console.error("Error obteniendo pedidos por email:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};



// 1.2 Actualizar estado de un pedido
export const actualizarEstadoPedido = async (req, res) => {
  try {
    const pedidoId = Number(req.params.id);
    const { estado } = req.body;
    // validación mínima
    const estadosPermitidos = ["RECIBIDO","EN_PREPARACION","LISTO_ENTREGA","EN_CAMINO","ENTREGADO"];
    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({ message: "Estado no válido" });
    }

    const pedido = await prisma.Pedidos.update({
      where: { id: pedidoId },
      data: { estado },
      include: {
        usuario: { select: { id: true, name: true, email: true } },
        detallePedido: { include: { producto: true } }
      }
    });
    return res.json({ pedido });
  } catch (error) {
    console.error("Error actualizando estado:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};


// obtener pedidos por usuario
export const obtenerPedidosUsuario = async (req, res) => {
  const usuarioId = req.userId;
  const pedidos = await prisma.Pedidos.findMany({
    where: { usuarioId },
    orderBy: { fecha_pedido: "desc" },
  });
  res.json({ pedidos });
};

// controllers/Pedido.controller.js
export const confirmarRecibo = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.userId;

  // 1) Validar existencia y pertenencia
  const pedido = await prisma.Pedidos.findUnique({
    where: { id: Number(id) }
  });
  if (!pedido || pedido.usuarioId !== usuarioId) {
    return res.status(404).json({ message: "Pedido no encontrado" });
  }

  // 2) Actualizar estado
  const actualizado = await prisma.Pedidos.update({
    where: { id: Number(id) },
    data: { estado: "RECIBIDO_CLIENTE" },
  });

  // 3) Devolver el pedido actualizado
  return res.json({ pedido: actualizado });
};


// Obtiene sólo los pedidos que el usuario confirmó recibido
export const obtenerHistorialUsuario = async (req, res) => {
  const usuarioId = req.userId;
  const pedidos = await prisma.Pedidos.findMany({
    where: {
      usuarioId,
      estado: "RECIBIDO_CLIENTE",
    },
    orderBy: { fecha_pedido: "desc" },
  });
  res.json({ pedidos });
};


// controllers/Pedido.controller.js
export const obtenerPedidoPorId = async (req, res) => {
  const { id } = req.params;
  const usuarioId = req.userId;

  const pedido = await prisma.Pedidos.findUnique({
    where: { id: Number(id) },
    include: {
      detallePedido: {
        include: {
          producto: {
            include: {
              imagenes: true     // <–– aquí incluimos imágenes
            }
          }
        }
      }
    }
  });

  if (!pedido || pedido.usuarioId !== usuarioId) {
    return res.status(404).json({ message: "Pedido no encontrado" });
  }
  res.json({ pedido });
};
