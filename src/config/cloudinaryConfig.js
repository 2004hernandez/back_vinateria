import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from 'cloudinary';

// Configuración de Cloudinary
cloudinary.v2.config({
  cloud_name: 'djugmkxms',
  api_key: '318319829499991',
  api_secret: 'ex6O7uUBMdgp9H-IxmfQWD_Z_Cs',
});

// Filtro para validar el tipo de archivo (solo imágenes)
// Filtro para validar el tipo de archivo (solo imágenes)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(
      new Error('El archivo debe ser una imagen válida (JPG, PNG, GIF, etc.)'),
      false
    );
  }
};

// Configuración dinámica del storage de Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary.v2,
  params: async (req, file) => {
    // Aquí decides la carpeta. 
    // Puedes pasarla en el body: req.body.folder
    // Si no hay nada, usas 'logo' por defecto
    const folderName = req.body.folder || 'logo';

    return {
      folder: folderName,
      format: 'png',          // Cambia el formato si lo deseas
      public_id: uuidv4(),    // Generar un ID único para cada imagen
      // Puedes añadir más params, por ejemplo transformation, tags, etc.
    };
  },
});

// Configuración de Multer con el storage dinámico y el filtro
const upload = multer({ storage, fileFilter });
export { upload };
