import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Crear un nuevo producto con imágenes subidas a Cloudinary*/
export const crearProducto = async (req, res) => {
  try {
    const { 
      name,
      description,
      precio, 
      sabor, 
      tamano,
      stock       // ← nuevo campo
    } = req.body;

    //  Manejo de imágenes (Cloudinary)
    let imagesURLs = [];
    if (req.files && req.files.length > 0) {
      imagesURLs = req.files.map((file) => file.path);
    }

    //  Crear el producto
    const newProduct = await prisma.Productos.create({
      data: {
        name,
        description: description || "",
        precio: precio ? Number(precio) : 0,
        sabor,
        tamano: tamano ? Number(tamano) : 0,
        stock: stock ? Number(stock) : 0,
        imagenes: imagesURLs.length
          ? { create: imagesURLs.map((imageUrl) => ({ imageUrl })) }
          : undefined,
      },
      include: {
        imagenes: true,
      },
    });

    return res.status(201).json({
      message: "Producto creado exitosamente",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error al crear el producto:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};


/**
 * Actualizar un producto (incluyendo subida de imágenes a Cloudinary)
 */
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Extraer campos del body
    const { name, description, precio, sabor, tamano, stock } = req.body;

    // req.files: nuevas imágenes subidas
    let newImagesURLs = [];
    if (req.files && req.files.length > 0) {
      newImagesURLs = req.files.map((file) => file.path);
    }

    // 1. Actualizar los campos básicos del producto
    const updatedProduct = await prisma.Productos.update({
      where: { id: numericId },
      data: {
        name,
        description,
        // Convertir a número si se proporciona
        precio: precio ? Number(precio) : undefined,
        sabor,
        // Usamos el campo "tamaño" del modelo a partir del valor "tamano" enviado
        tamano: tamano ? Number(tamano) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
      },
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // 2. Manejo de imágenes
    // Si se indica en el body que se deben remover las imágenes anteriores
    if (req.body.removeOldImages && req.body.removeOldImages === "true") {
      await prisma.ImagenesProductos.deleteMany({ where: { productoId: numericId } });
    }

    // Crear nuevas imágenes si existen
    if (newImagesURLs.length > 0) {
      await prisma.ImagenesProductos.createMany({
        data: newImagesURLs.map((url) => ({
          imageUrl: url,
          productoId: numericId,
        })),
      });
    }

    // 3. Retornar el producto con sus relaciones actualizadas
    const productWithRelations = await prisma.Productos.findUnique({
      where: { id: numericId },
      include: { imagenes: true },
    });

    res.status(200).json({
      message: "Producto actualizado exitosamente",
      product: productWithRelations,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Producto no encontrado." });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};





export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Verificar si existe el producto
    const existingProduct = await prisma.Productos.findUnique({
      where: { id: numericId },
    });
    if (!existingProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    // Eliminar las imágenes asociadas al producto
    await prisma.ImagenesProductos.deleteMany({ where: { productoId: numericId } });

    // Eliminar el producto
    await prisma.Productos.delete({ where: { id: numericId } });

    res.status(200).json({ message: "Producto eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


export const obtenerProductoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    const producto = await prisma.Productos.findUnique({
      where: { id: numericId },
      include: {
        imagenes: true,        // imágenes del producto
        review: {
          include: {
            usuario: true,     // datos del usuario que hizo la reseña
            images: true       // ✅ este es el campo correcto en tu schema.prisma
          }
        }
      },
    });

    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    return res.status(200).json({ producto });
  } catch (error) {
    console.error("Error al obtener producto por ID:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};



export const obtenerProductosAdmin = async (req, res) => {
  try {
    // Obtener todos los productos sin paginación
    const productos = await prisma.Productos.findMany({
      include: {
        imagenes: true,
        review: true, // Si no necesitas las reviews, puedes quitar esta línea
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ productos });
  } catch (error) {
    console.error("Error al obtener productos para administración:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const obtenerProductosRecomendados = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Falta el ID del producto" });

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) return res.status(400).json({ message: "ID inválido" });

    // Llamar al microservicio FastAPI con el ID del producto usando fetch
    const url = `https://vinateria-recomendaciones.bwet7p.easypanel.host/recomendar?ids=${parsedId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error al llamar al microservicio");

    const data = await response.json();
    const recomendados = data?.ids_recomendados || [];

    if (recomendados.length === 0) {
      return res.status(200).json({ productos: [] });
    }

    // Buscar los productos recomendados en tu base de datos
    const productos = await prisma.Productos.findMany({
      where: {
        id: { in: recomendados },
      },
      include: {
        imagenes: true,
        review: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ productos });
  } catch (error) {
    console.error("Error al obtener productos recomendados:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};



//crear promocion
export const crearPromocion = async (req, res) => {
  try {
    const { 
      titulo,
      descripcion,
      fechaInicio, 
      fechaFin, 
      descuento,
      productoId,
      activo       // ← nuevo campo
    } = req.body;

    // 1) Validar que el producto exista
    const producto = await prisma.Productos.findUnique({
      where: { id: Number(productoId) }
    });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    //  Crear el producto
    const newPromocion = await prisma.Promocion.create({
      data: {
        titulo,
        descripcion: descripcion || "",
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        descuento: Number(descuento) || 0,
        activo: activo ?? true,
        producto: { connect: { id: Number(productoId) } }
      },

    });

    return res.status(201).json({
      message: "Promocion creado exitosamente",
      promocion: newPromocion,
    });
  } catch (error) {
    console.error("Error al crear lapromocion:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const obtenerProductosConYSinDescuento = async (req, res) => {
  try {
    // Obtener productos con promoción activa
    const productosConDescuento = await prisma.Productos.findMany({
      where: {
        promociones: {
          some: { activo: true, fechaInicio: { lte: new Date() }, OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }] }
        }
      },
      include: {
        promociones: {
          where: {
            activo: true,
            fechaInicio: { lte: new Date() },
            OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }]
          },
          take: 1, // Solo la primera promoción activa
        }
      }
    });

    // Obtener productos sin promoción activa
    const productosSinDescuento = await prisma.Productos.findMany({
      where: {
        promociones: {
          none: { activo: true, fechaInicio: { lte: new Date() }, OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }] }
        }
      }
    });

    res.status(200).json({
      productosConDescuento,
      productosSinDescuento
    });

  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


/**
 * Obtener productos con stock bajo (<= 3)
 */
export const obtenerProductosBajoStock = async (req, res) => {
  try {
    const productos = await prisma.Productos.findMany({
      where: { stock: { lte: 3 } },
      include: {
        imagenes: true
      },
      orderBy: { stock: 'asc' }
    });
    res.status(200).json({ productos });
  } catch (error) {
    console.error("Error al obtener productos de bajo stock:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
