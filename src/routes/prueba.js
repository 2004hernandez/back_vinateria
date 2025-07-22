import { Router } from 'express';  // Asegúrate de esta importación
import { enviarCorreoPrueba } from '../controllers/pruebas.js'; // Importar solo la función

const router = Router();  // Crear instancia del Router

// Ruta de prueba para enviar un correo
router.get('/send-test-email', enviarCorreoPrueba);

export default router;  // Exportar la instancia del router
