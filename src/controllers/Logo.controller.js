import { PrismaClient } from '@prisma/client';
import { upload } from '../config/cloudinaryConfig.js'; // Configuración de Cloudinary
import sanitizeHtml from 'sanitize-html';

const prisma = new PrismaClient();

/**
 * Subir un nuevo logo
 */
export const subirLogo = async (req, res) => {
  try {
    // Usamos multer con Cloudinary para procesar la subida
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.message === 'El archivo debe ser una imagen válida (JPG, PNG, etc.)') {
          return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: 'Error al subir la imagen' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No se ha enviado un archivo válido.' });
      }

      // Opcional: sanitizar el autor si quieres
      const autorSanitized = sanitizeHtml(req.body.autor || '', {
        allowedTags: [],
        allowedAttributes: {},
      });

      // Crear un nuevo registro en la tabla Logos
      const newLogo = await prisma.logos.create({
        data: {
          url: req.file.path,     // URL generada por Cloudinary
          autor: autorSanitized,  // Autor pasado en el body (sanitizado)
          // fechaSubida se asigna por defecto con now() en el esquema
        },
      });

      res.status(201).json({
        message: 'Logo subido y guardado exitosamente',
        logo: newLogo,
      });
    });
  } catch (error) {
    console.error('Error al subir el logo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtener el logo más reciente
 */
export const obtenerUltimoLogo = async (req, res) => {
  try {
    // Busca el primer registro ordenado por fechaSubida desc
    const ultimoLogo = await prisma.logos.findFirst({
      orderBy: { fechaSubida: 'desc' },
    });

    if (!ultimoLogo) {
      return res.status(404).json({ message: 'No se encontró un logo subido' });
    }

    res.status(200).json(ultimoLogo);
  } catch (error) {
    console.error('Error al obtener el último logo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtener todos los logos subidos
 */
export const obtenerTodosLosLogos = async (req, res) => {
  try {
    // Ordenar por fechaSubida desc
    const logos = await prisma.logos.findMany({
      orderBy: { fechaSubida: 'desc' },
    });
    res.status(200).json(logos);
  } catch (error) {
    console.error('Error al obtener los logos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};