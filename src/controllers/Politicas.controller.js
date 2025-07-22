import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

const prisma = new PrismaClient();

/**
 * Crear una nueva política de privacidad
 */
export const createPrivacyPolicy = async (req, res) => {
  try {
    let { title, content, effectiveDate } = req.body;

    // Sanitizar campos
    title = sanitizeHtml(title, {
      allowedTags: [],
      allowedAttributes: {},
    });
    content = sanitizeHtml(content, {
      allowedTags: ["b", "i", "u"],
      allowedAttributes: {},
    });

    // Validar campos requeridos
    if (!title || !content || !effectiveDate) {
      return res.status(400).json({
        message: "Todos los campos son requeridos, revise su solicitud.",
      });
    }

    // Validar que la fecha de vigencia no sea anterior a la fecha actual
    if (new Date(effectiveDate) < new Date()) {
      return res.status(400).json({
        message: "La fecha de vigencia no puede ser anterior a la fecha actual.",
      });
    }

    // Crear la nueva política con isCurrent = false
    const newPolicy = await prisma.politicas.create({
      data: {
        title,
        content,
        effectiveDate: new Date(effectiveDate),
        isCurrent: false,
      },
    });

    return res.status(201).json({
      message: "Política de privacidad creada exitosamente",
      policy: newPolicy,
    });
  } catch (error) {
    console.error("Error al crear la política de privacidad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Obtener la política de privacidad actual (isCurrent = true)
 */
export const getCurrentPrivacyPolicy = async (req, res) => {
  try {
    // findFirst con isCurrent = true
    const currentPolicy = await prisma.politicas.findFirst({
      where: { isCurrent: true },
    });

    if (!currentPolicy) {
      return res
        .status(404)
        .json({ message: "No se encontró una política de privacidad actual" });
    }

    res.status(200).json(currentPolicy);
  } catch (error) {
    console.error("Error al obtener la política de privacidad actual:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Obtener todas las políticas de privacidad (ordenadas por createdAt desc)
 */
export const getAllPrivacyPolicies = async (req, res) => {
  try {
    const policies = await prisma.politicas.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(policies);
  } catch (error) {
    console.error("Error al obtener todas las políticas de privacidad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Actualizar una política de privacidad existente
 */
export const updatePrivacyPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, effectiveDate } = req.body;

    // Convertir el id a número
    const numericId = Number(id);

    // Actualizar el registro
    // Nota: si deseas sanitizar aquí también, puedes hacerlo igual que en create
    const updatedPolicy = await prisma.politicas.update({
      where: { id: numericId },
      data: {
        title,
        content,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      },
    });

    if (!updatedPolicy) {
      return res
        .status(404)
        .json({ message: "No se encontró la política de privacidad a actualizar" });
    }

    res.status(200).json({
      message: "Política de privacidad actualizada exitosamente",
      policy: updatedPolicy,
    });
  } catch (error) {
    console.error("Error al actualizar la política de privacidad:", error);
    // Si no encuentra el registro, Prisma lanza error con code 'P2025'
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ message: "No se encontró la política de privacidad a actualizar" });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Eliminar una política de privacidad
 */
export const deletePrivacyPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ message: "El ID de la política es requerido." });
    }

    const numericId = Number(id);

    // Buscar la política a eliminar
    const policyToDelete = await prisma.politicas.findUnique({
      where: { id: numericId },
    });
    if (!policyToDelete) {
      return res.status(404).json({ message: "Política no encontrada." });
    }

    // Eliminar la política
    await prisma.politicas.delete({
      where: { id: numericId },
    });

    // Si la política eliminada era la actual, establecer la más reciente como actual
    if (policyToDelete.isCurrent) {
      const latestPolicy = await prisma.politicas.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (latestPolicy) {
        const updatedLatest = await prisma.politicas.update({
          where: { id: latestPolicy.id },
          data: { isCurrent: true },
        });
        return res.status(200).json({
          message:
            "Política eliminada y la más reciente establecida como actual.",
          latestPolicy: updatedLatest,
        });
      } else {
        return res.status(200).json({
          message: "Política eliminada. No hay más políticas disponibles.",
        });
      }
    }

    return res
      .status(200)
      .json({ message: "Política eliminada exitosamente." });
  } catch (error) {
    console.error("Error al eliminar la política de privacidad:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * Establecer una política como la actual
 */
export const setAsCurrentPrivacyPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // Desmarcar cualquier política que esté como actual
    await prisma.politicas.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    });

    // Marcar la nueva política como actual
    const currentPolicy = await prisma.politicas.update({
      where: { id: numericId },
      data: { isCurrent: true },
    });

    if (!currentPolicy) {
      return res.status(404).json({
        message:
          "No se encontró la política de privacidad a establecer como actual",
      });
    }

    return res.status(200).json({
      message: "Política de privacidad marcada como actual exitosamente",
      policy: currentPolicy,
    });
  } catch (error) {
    console.error(
      "Error al establecer la política de privacidad como actual:",
      error
    );
    if (error.code === "P2025") {
      return res.status(404).json({
        message:
          "No se encontró la política de privacidad a establecer como actual",
      });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};