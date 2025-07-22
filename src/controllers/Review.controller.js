import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// 1. Productos elegibles para reseñar: pedidos con estado RECIBIDO_CLIENTE
export const obtenerElegiblesParaResena = async (req, res) => {
  const usuarioId = req.userId;
  // 1) Recuperamos los pedidos confirmados por el cliente e incluimos imagenes del producto:
  const pedidos = await prisma.Pedidos.findMany({
    where: { usuarioId, estado: "RECIBIDO_CLIENTE" },
    include: {
      detallePedido: {
        include: {
          producto: {
            include: { imagenes: true }
          }
        }
      }
    }
  });

  // 2) Extraemos los productos de cada detalle
  const elegibles = [];
  pedidos.forEach(pedido => {
    pedido.detallePedido.forEach(item => {
      const prod = item.producto;
      elegibles.push({
        productoId: prod.id,
        name: prod.name,
        // ahora sí trayendo imagenes
        imageUrl: prod.imagenes?.[0]?.imageUrl || null
      });
    });
  });

  // 3) Eliminamos duplicados
  const únicos = Object.values(
    elegibles.reduce((acc, cur) => {
      acc[cur.productoId] = cur;
      return acc;
    }, {})
  );

  return res.json({ productos: únicos });
};


// 2. Crear reseña
export const crearResena = async (req, res) => {
  const usuarioId  = req.userId;
  const { productoId, comment, rating } = req.body;

  // Validar duplicado
  const existente = await prisma.Review.findFirst({
    where: { usuarioId, productoId: Number(productoId) }
  });
  if (existente) {
    return res.status(400).json({ message: "Ya has reseñado este producto" });
  }

  // 1) Crear la reseña
  const review = await prisma.Review.create({
    data: {
      usuarioId:  usuarioId,
      productoId: Number(productoId),
      comment,
      rating:     Number(rating),
    }
  });

  // 2) Si llegaron archivos, creamos los ReviewImage
  if (req.files && req.files.length) {
    const imagesData = req.files.map(f => ({
      reviewId: review.id,
      url:      f.path  // multer-cloudinary deja la URL en `path`
    }));
    await prisma.ReviewImage.createMany({ data: imagesData });
  }

  // 3) Devolver la reseña con sus imágenes
  const result = await prisma.Review.findUnique({
    where: { id: review.id },
    include: {
      images: true
    }
  });
  res.status(201).json({ review: result });
};
