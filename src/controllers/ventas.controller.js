// controllers/ventas.controller.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * GET /ventas/general
 * Devuelve:
 *   - totalSales: número total de ventas
 *   - totalRevenue: suma de todos los totales de venta
 *   - averageTicket: ingreso promedio por venta
 */
export const getVentasGeneral = async (req, res) => {
  try {
    // 1) Total de ventas
    const totalSales = await prisma.sales.count();

    // 2) Ingresos totales
    const revenueResult = await prisma.sales.aggregate({
      _sum: { total: true },
    });
    const totalRevenue = revenueResult._sum.total || 0;

    // 3) Ticket promedio
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    res.json({
      totalSales,
      totalRevenue,
      averageTicket,
    });
  } catch (error) {
    console.error("Error en getVentasGeneral:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


/**
 * GET /ventas/diarias
 * Devuelve un array con { date, count, revenue } por cada día
 * en el rango de los últimos 7 días (por defecto).
 */
export const getVentasDiarias = async (req, res) => {
  try {
    // Parámetro opcional ?days=7 (por defecto 7 días)
    const days = Number(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days + 1);

    // 1) Traer todas las ventas del rango (sin agrupar)
    const ventas = await prisma.Sales.findMany({
      where: { fechaVenta: { gte: since } },
      select: { fechaVenta: true, total: true },
    });

    // 2) Agruparlas por fecha YYYY-MM-DD
    const agrupadas = ventas.reduce((acc, { fechaVenta, total }) => {
      const dia = fechaVenta.toISOString().slice(0, 10);
      if (!acc[dia]) acc[dia] = { count: 0, revenue: 0 };
      acc[dia].count += 1;
      acc[dia].revenue += total;
      return acc;
    }, {});

    // 3) Construir el array final, rellenando días sin ventas
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const dayData = agrupadas[iso] || { count: 0, revenue: 0 };
      result.push({
        date:    iso,
        count:   dayData.count,
        revenue: dayData.revenue,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("Error en getVentasDiarias:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};


export const getVentasPorFecha = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Falta parámetro date" });

    // Construir rango [date 00:00, date+1 00:00)
    const start = new Date(date);
    const end   = new Date(date);
    end.setDate(end.getDate() + 1);

    const ventas = await prisma.Sales.findMany({
      where: {
        fechaVenta: { gte: start, lt: end }
      },
      include: {
        producto: { select: { id: true, name: true } },
        usuario:  { select: { id: true, name: true, email: true } }
      },
      orderBy: { fechaVenta: "asc" }
    });

    res.json(ventas);
  } catch (error) {
    console.error("Error en getVentasPorFecha:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};


