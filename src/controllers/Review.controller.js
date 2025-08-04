import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const obtenerElegiblesParaResena = async (req, res) => {
  const usuarioId = req.userId;

  // 1. Obtener productos ya reseñados por el usuario
  const reseñasExistentes = await prisma.Review.findMany({
    where: { usuarioId },
    select: { productoId: true }
  });

  // Extraer solo los IDs
  const productosYaReseñados = reseñasExistentes.map(r => r.productoId);

  // 2. Obtener pedidos recibidos por el cliente
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

  // 3. Extraer productos no reseñados
  const elegibles = [];
  pedidos.forEach(pedido => {
    pedido.detallePedido.forEach(item => {
      const prod = item.producto;

      // Excluir si ya está reseñado
      if (!productosYaReseñados.includes(prod.id)) {
        elegibles.push({
          productoId: prod.id,
          name: prod.name,
          imageUrl: prod.imagenes?.[0]?.imageUrl || null
        });
      }
    });
  });

  // 4. Eliminar duplicados por productoId
  const únicos = Object.values(
    elegibles.reduce((acc, cur) => {
      acc[cur.productoId] = cur;
      return acc;
    }, {})
  );

  return res.json({ productos: únicos });
};



export const crearResena = async (req, res) => {
  const usuarioId  = req.userId;
  const { productoId, comment, sabor, empaque, precio, recomendacion, entrega } = req.body;

  // Validar duplicado
  const existente = await prisma.Review.findFirst({
    where: { usuarioId, productoId: Number(productoId) }
  });
  if (existente) {
    return res.status(400).json({ message: "Ya has reseñado este producto" });
  }

  // Llamar al microservicio de predicción
  let rating = 3; // valor por defecto
  try {
    const params = new URLSearchParams({ sabor, empaque, precio, recomendacion, entrega });
    const response = await fetch(`https://vinateria-reviews.bwet7p.easypanel.host/predecir?${params.toString()}`);
    const data = await response.json();
    rating = data.redondeado ?? 3;
  } catch (error) {
    console.error("❌ Error al obtener predicción de estrellas:", error);
    // rating se mantiene como 3 si falla
  }

  // 1) Crear la reseña con el rating predicho
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
      url:      f.path
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

