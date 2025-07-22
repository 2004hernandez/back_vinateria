import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getAllSales = async (req, res) => {
  try {
    const ventas = await prisma.Sales.findMany({
      include: {
        producto: {
          select: {
            id: true,
            name: true,
            precio: true,
          },
        },
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { fechaVenta: 'desc' },
    });

    return res.status(200).json({ ventas });
  } catch (error) {
    console.error("Error al obtener todas las ventas:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};


export const getTopSellingProducts = async (req, res) => {
  try {
    // Permite recibir ?limit=5 (por defecto 5)
    const limit = parseInt(req.query.limit) || 5;

    // Agrupar por productoId sumando las cantidades vendidas
    const agrupado = await prisma.Sales.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: limit,
    });

    // Obtener detalles completos de cada producto
    const topProducts = await Promise.all(
      agrupado.map(async (row) => {
        const producto = await prisma.Productos.findUnique({
          where: { id: row.productoId },
          include: { imagenes: true },
        });
        return {
          producto,
          totalVendido: row._sum.cantidad,
        };
      })
    );

    return res.status(200).json({ topProducts });
  } catch (error) {
    console.error("Error al obtener top de ventas:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};




export const getLeastSellingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const agrupado = await prisma.Sales.groupBy({
      by: ['productoId'],
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: 'asc' } },
      take: limit,
    });

    const leastProducts = await Promise.all(
      agrupado.map(async ({ productoId, _sum }) => {
        const producto = await prisma.Productos.findUnique({
          where: { id: productoId },
          include: { imagenes: true },
        });
        return {
          producto,
          totalVendido: _sum.cantidad,
        };
      })
    );

    return res.status(200).json({ leastProducts });
  } catch (error) {
    console.error("Error al obtener productos menos vendidos:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const getProductsStockForChart = async (req, res) => {
  try {
    // Se obtienen todos los productos con el stock actual y el nombre.
    const products = await prisma.Productos.findMany({
      select: {
        id: true,
        name: true,
        stock: true, // stock actual
      },
    });

    // Para cada producto, se calcula la cantidad total vendida a partir de Sales.
    // Se asume que el stock inicial es: stock actual + total vendido.
    const productsStockData = await Promise.all(
      products.map(async (prod) => {
        const salesAgg = await prisma.Sales.aggregate({
          _sum: { cantidad: true },
          where: { productoId: prod.id },
        });
        const totalSold = salesAgg._sum.cantidad || 0;
        const initialStock = prod.stock + totalSold;
        return {
          id: prod.id,
          name: prod.name,
          currentStock: prod.stock,
          initialStock,
          sold: totalSold,
        };
      })
    );

    return res.status(200).json({ products: productsStockData });
  } catch (error) {
    console.error("Error al obtener datos de stock para gráfica:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};