import { Router } from 'express';
import * as termsController from '../controllers/Terminos.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Crear términos
router.post('/terms', isAuthenticated, isAdmin, termsController.createTerms);

// Obtener términos actuales
router.get('/terms/current', termsController.getCurrentTerms);

// Obtener todos los términos
router.get('/terms', isAuthenticated, isAdmin, termsController.getAllTerms);

// Actualizar términos
router.put('/terms/:id', isAuthenticated, isAdmin, termsController.updateTerms);

// Eliminar términos
router.delete('/terms/:id', isAuthenticated, isAdmin, termsController.deleteTerms);

// Establecer términos como actuales
router.put('/terms/:id/set-current', isAuthenticated, isAdmin, termsController.setAsCurrentTerms);

export default router;