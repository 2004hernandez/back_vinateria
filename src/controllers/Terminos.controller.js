import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

const prisma = new PrismaClient();
/**
 * Crear un nuevo documento de términos y condiciones
 */
export const createTerms = async (req, res) => {
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
        return res.status(400).json({ message: "Todos los campos son requeridos." });
      }
  
      // Validar fecha de vigencia (no puede ser anterior a la fecha actual)
      if (new Date(effectiveDate) < new Date()) {
        return res
          .status(400)
          .json({ message: "La fecha de vigencia no puede ser anterior a la fecha actual." });
      }
  
      // Crear el documento en la tabla `TerminosYCondiciones`
      const newTerms = await prisma.Terminos.create({
        data: {
          title,
          content,
          effectiveDate: new Date(effectiveDate),
          isCurrent: false, // Por defecto, no son los términos actuales
        },
      });
  
      return res
        .status(201)
        .json({ message: "Términos creados exitosamente", terms: newTerms });
    } catch (error) {
      console.error("Error al crear términos y condiciones:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };
  
  /**
   * Obtener los términos actuales (isCurrent = true)
   */
  export const getCurrentTerms = async (req, res) => {
    try {
      // Busca el primer registro que tenga isCurrent = true
      const currentTerms = await prisma.Terminos.findFirst({
        where: { isCurrent: true },
      });
  
      if (!currentTerms) {
        return res
          .status(404)
          .json({ message: "No se encontraron términos actuales" });
      }
  
      res.status(200).json(currentTerms);
    } catch (error) {
      console.error("Error al obtener los términos actuales:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Obtener todos los términos
export const getAllTerms = async (req, res) => {
    try {
      // findMany ordenado por createdAt desc
      const terms = await prisma.Terminos.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json(terms);
    } catch (error) {
      console.error("Error al obtener todos los términos:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

// Actualizar términos
export const updateTerms = async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, effectiveDate } = req.body;
  
      // Convertimos 'id' a número para Prisma
      const numericId = Number(id);
  
      // Actualizar el registro
      // Prisma por defecto retorna el documento actualizado
      const updatedTerms = await prisma.Terminos.update({
        where: { id: numericId },
        data: {
          title,
          content,
          // Si effectiveDate existe, lo convertimos a Date
          // Si no, lo dejamos como undefined para no sobreescribir
          effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        },
      });
  
      res
        .status(200)
        .json({ message: "Términos actualizados exitosamente", terms: updatedTerms });
    } catch (error) {
      console.error("Error al actualizar términos:", error);
      // Prisma lanza error con code 'P2025' si no encuentra registro
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ message: "No se encontraron términos para actualizar" });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

// Eliminar términos
export const deleteTerms = async (req, res) => {
    try {
      const { id } = req.params;
      const numericId = Number(id);
  
      // 1. Verificar si existe
      const termsToDelete = await prisma.Terminos.findUnique({
        where: { id: numericId },
      });
      if (!termsToDelete) {
        return res.status(404).json({ message: "Términos no encontrados." });
      }
  
      // 2. Eliminar el término
      await prisma.Terminos.delete({
        where: { id: numericId },
      });
  
      // 3. Si los términos eliminados eran los actuales, establecer otro como actual
      if (termsToDelete.isCurrent) {
        // Buscar el más reciente por createdAt DESC
        const latestTerms = await prisma.Terminos.findFirst({
          orderBy: { createdAt: 'desc' },
        });
  
        if (latestTerms) {
          // Marcarlo como actual
          const updatedLatest = await prisma.Terminos.update({
            where: { id: latestTerms.id },
            data: { isCurrent: true },
          });
          return res.status(200).json({
            message: "Términos eliminados y el más reciente establecido como actual.",
            latestTerms: updatedLatest,
          });
        }
      }
  
      return res
        .status(200)
        .json({ message: "Términos eliminados exitosamente." });
    } catch (error) {
      console.error("Error al eliminar términos:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };

// Establecer términos como actuales
export const setAsCurrentTerms = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    // 1. Desmarcar todos los términos actuales
    await prisma.Terminos.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    }); 

    // 2. Marcar el nuevo término como actual
    const currentTerms = await prisma.Terminos.update({
      where: { id: numericId },
      data: { isCurrent: true },
    });

    // Si no existe ese ID, Prisma lanza un error (p.ej. code P2025)
    if (!currentTerms) {
      return res.status(404).json({
        message: "No se encontraron términos para establecer como actuales",
      });
    }

    return res.status(200).json({
      message: "Términos establecidos como actuales exitosamente",
      terms: currentTerms,
    });
  } catch (error) {
    console.error("Error al establecer términos como actuales:", error);
    // Manejar error de registro no encontrado
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "No se encontraron términos para establecer como actuales",
      });
    }
    res.status(500).json({ message: "Error interno del servidor" });
  }
};
