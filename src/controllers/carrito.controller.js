import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export const agregarProductoCarrito = async (req, res) => {
  try {
    // Verifica que el usuario esté autenticado
    if (!req.userId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }
    const usuarioId = req.userId;
    const { productId, cantidad } = req.body;
    const qty = cantidad ? Number(cantidad) : 1;

    // Verificar que el producto exista
    const producto = await prisma.Productos.findUnique({
      where: { id: Number(productId) },
    });
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Revisar si el producto ya está en el carrito del usuario
    const carritoExistente = await prisma.Carrito.findFirst({
      where: {
        usuarioId,
        productoId: Number(productId),
      },
    });

    let carritoItem;
    if (carritoExistente) {
      // Incrementar la cantidad existente
      carritoItem = await prisma.Carrito.update({
        where: { id: carritoExistente.id },
        data: { cantidad: carritoExistente.cantidad + qty },
      });
    } else {
      // Crear una nueva entrada en el carrito
      carritoItem = await prisma.Carrito.create({
        data: {
          usuarioId,
          productoId: Number(productId),
          cantidad: qty,
        },
      });
    }

    return res.status(200).json({ message: "Producto agregado al carrito", carritoItem });
  } catch (error) {
    console.error("Error al agregar producto al carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const obtenerCarrito = async (req, res) => {
  try {
    // Se asume que el middleware asigna el id del usuario autenticado en req.userId
    const usuarioId = req.userId;

    // Obtener todos los items del carrito del usuario, incluyendo detalles del producto e imágenes
    const carritoItems = await prisma.Carrito.findMany({
      where: { usuarioId },
      include: {
        producto: {
          include: {
            imagenes: true,
          },
        },
      },
    });

    return res.status(200).json({ carrito: carritoItems });
  } catch (error) {
    console.error("Error al obtener el carrito:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Actualiza la cantidad de un carrito existente
export const actualizarCantidadCarrito = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const carritoId = Number(req.params.id);
    const { cantidad } = req.body;
    const qty = Number(cantidad);
    if (qty < 1) {
      return res.status(400).json({ message: "La cantidad debe ser al menos 1" });
    }

    // Verificar que el ítem exista y pertenezca al usuario
    const item = await prisma.Carrito.findFirst({
      where: { id: carritoId, usuarioId }
    });
    if (!item) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }

    const actualizado = await prisma.Carrito.update({
      where: { id: carritoId },
      data: { cantidad: qty },
      include: {
        producto: { include: { imagenes: true } }
      }
    });

    return res.status(200).json({ carritoItem: actualizado });
  } catch (error) {
    console.error("Error actualizando cantidad:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Elimina un ítem del carrito
export const eliminarProductoCarrito = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const carritoId = Number(req.params.id);

    // Verificar que el ítem exista y pertenezca al usuario
    const item = await prisma.Carrito.findFirst({
      where: { id: carritoId, usuarioId }
    });
    if (!item) {
      return res.status(404).json({ message: "Ítem no encontrado" });
    }

    await prisma.Carrito.delete({ where: { id: carritoId } });
    return res.status(200).json({ message: "Producto eliminado del carrito" });
  } catch (error) {
    console.error("Error eliminando ítem:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
