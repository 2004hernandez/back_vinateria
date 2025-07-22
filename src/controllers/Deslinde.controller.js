import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

const prisma = new PrismaClient();

/**
 * Crear un nuevo deslinde
 */
export const createDeslinde = async (req, res) => {
  try {
    let { title, content, effectiveDate } = req.body;

    // Sanitizar campos
    title = sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} });
    content = sanitizeHtml(content, {
      allowedTags: ["b", "i", "u"],
      allowedAttributes: {},
    });

    // Validar campos requeridos
    if (!title || !content || !effectiveDate) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos, revise su solicitud." });
    }

    // Validar fecha de vigencia
    if (new Date(effectiveDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "La fecha de vigencia no puede ser anterior a la fecha actual." });
    }

    // Crear un nuevo deslinde con isCurrent = false
    const newDeslinde = await prisma.deslindeDeResponsabilidad.create({
      data: {
        title,
        content,
        effectiveDate: new Date(effectiveDate),
        isCurrent: false,
      },
    });

    return res.status(201).json({
      message: "Deslinde creado exitosamente",
      deslinde: newDeslinde,
    });
  } catch (error) {
    console.error("Error al crear el deslinde:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Obtener el deslinde actual (isCurrent = true)
 */
export const getCurrentDeslinde = async (req, res) => {
  try {
    const currentDeslinde = await prisma.deslindeDeResponsabilidad.findFirst({
      where: { isCurrent: true },
    });

    if (!currentDeslinde) {
      return res
        .status(404)
        .json({ message: "No se encontró un deslinde actual" });
    }

    res.status(200).json(currentDeslinde);
  } catch (error) {
    console.error("Error al obtener el deslinde actual:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Obtener todos los deslindes (ordenados por createdAt desc)
 */
export const getAllDeslindes = async (req, res) => {
  try {
    const deslindes = await prisma.deslindeDeResponsabilidad.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(deslindes);
  } catch (error) {
    console.error("Error al obtener todos los deslindes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Actualizar un deslinde existente
 */
export const updateDeslinde = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, effectiveDate } = req.body;
    const numericId = Number(id);

    // Actualizar el registro
    const updatedDeslinde = await prisma.deslindeDeResponsabilidad.update({
      where: { id: numericId },
      data: {
        title,
        content,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      },
    });

    if (!updatedDeslinde) {
      return res
        .status(404)
        .json({ message: "No se encontró el deslinde a actualizar" });
    }

    res.status(200).json({
      message: "Deslinde actualizado exitosamente",
      deslinde: updatedDeslinde,
    });
  } catch (error) {
    console.error("Error al actualizar el deslinde:", error);
    // Prisma lanza un error code='P2025' si no encuentra registro
    if (error.code === 'P2025') {
      return res
        .status(404)
        .json({ message: "No se encontró el deslinde a actualizar" });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Eliminar un deslinde
 */
export const deleteDeslinde = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ message: "El ID del deslinde es requerido." });
    }
    const numericId = Number(id);

    // Buscar el deslinde a eliminar
    const deslindeToDelete = await prisma.deslindeDeResponsabilidad.findUnique({
      where: { id: numericId },
    });
    if (!deslindeToDelete) {
      return res.status(404).json({ message: "Deslinde no encontrado." });
    }

    // Eliminar el deslinde
    await prisma.deslindeDeResponsabilidad.delete({
      where: { id: numericId },
    });

    // Si el deslinde eliminado era el actual, establecer el más reciente como actual
    if (deslindeToDelete.isCurrent) {
      const latestDeslinde = await prisma.deslindeDeResponsabilidad.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      if (latestDeslinde) {
        const updatedLatest = await prisma.deslindeDeResponsabilidad.update({
          where: { id: latestDeslinde.id },
          data: { isCurrent: true },
        });
        return res.status(200).json({
          message:
            "Deslinde eliminado y el más reciente establecido como actual.",
          latestDeslinde: updatedLatest,
        });
      } else {
        return res.status(200).json({
          message: "Deslinde eliminado. No hay más deslindes disponibles.",
        });
      }
    }

    return res
      .status(200)
      .json({ message: "Deslinde eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar el deslinde:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * Establecer un deslinde como el actual
 */
export const setAsCurrentDeslinde = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Desmarcar cualquier deslinde que esté como actual
    await prisma.deslindeDeResponsabilidad.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Marcar el nuevo deslinde como actual
    const currentDeslinde = await prisma.deslindeDeResponsabilidad.update({
      where: { id: numericId },
      data: { isCurrent: true },
    });

    if (!currentDeslinde) {
      return res
        .status(404)
        .json({ message: "No se encontró el deslinde a establecer como actual" });
    }

    return res.status(200).json({
      message: "Deslinde marcado como actual exitosamente",
      deslinde: currentDeslinde,
    });
  } catch (error) {
    console.error("Error al establecer el deslinde como actual:", error);
    if (error.code === 'P2025') {
      return res
        .status(404)
        .json({ message: "No se encontró el deslinde a establecer como actual" });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};