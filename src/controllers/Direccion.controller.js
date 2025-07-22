import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Listar todas las direcciones del usuario autenticado
export const listarDirecciones = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const direcciones = await prisma.Direccion.findMany({
      where: { usuarioId },
      orderBy: { alias: "asc" },
    });
    return res.json(direcciones);
  } catch (error) {
    console.error("Error listando direcciones:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Crear una nueva dirección para el usuario
export const crearDireccion = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const {
      alias,
      calle,
      numeroExterior,
      numeroInterior,
      colonia,
      ciudad,
      estado,
      codigoPostal,
      pais,
    } = req.body;

    const nueva = await prisma.Direccion.create({
      data: {
        usuarioId,
        alias,
        calle,
        numeroExterior,
        numeroInterior,
        colonia,
        ciudad,
        estado,
        codigoPostal,
        pais,
      },
    });

    return res.status(201).json(nueva);
  } catch (error) {
    console.error("Error creando dirección:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Actualizar una dirección existente del usuario
export const actualizarDireccion = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const id = Number(req.params.id);
    const {
      alias,
      calle,
      numeroExterior,
      numeroInterior,
      colonia,
      ciudad,
      estado,
      codigoPostal,
      pais,
    } = req.body;

    // Verificar que la dirección pertenezca al usuario
    const existente = await prisma.Direccion.findFirst({
      where: { id, usuarioId },
    });
    if (!existente) {
      return res.status(404).json({ message: "Dirección no encontrada" });
    }

    const actualizada = await prisma.Direccion.update({
      where: { id },
      data: {
        alias,
        calle,
        numeroExterior,
        numeroInterior,
        colonia,
        ciudad,
        estado,
        codigoPostal,
        pais,
      },
    });

    return res.json(actualizada);
  } catch (error) {
    console.error("Error actualizando dirección:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Eliminar una dirección del usuario
export const eliminarDireccion = async (req, res) => {
  try {
    const usuarioId = req.userId;
    const id = Number(req.params.id);

    // Verificar existencia y pertenencia
    const existente = await prisma.Direccion.findFirst({
      where: { id, usuarioId },
    });
    if (!existente) {
      return res.status(404).json({ message: "Dirección no encontrada" });
    }

    await prisma.Direccion.delete({ where: { id } });
    return res.status(204).end();
  } catch (error) {
    console.error("Error eliminando dirección:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};