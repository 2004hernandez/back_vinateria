import { Router } from 'express';
import * as paypalController from '../controllers/Paypal.controller.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Crear orden de PayPal
router.post('/create-order', paypalController.crearOrdenPaypal);

// Capturar orden de PayPal
router.post('/capture-order', paypalController.capturarOrdenPaypal);

export default router;