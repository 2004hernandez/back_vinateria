import { Router } from 'express';
import * as deslindeController from '../controllers/Deslinde.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Crear un deslinde
router.post('/deslinde', isAuthenticated, isAdmin, deslindeController.createDeslinde);

// Obtener el deslinde actual
router.get('/deslinde/current', deslindeController.getCurrentDeslinde);

// Obtener todos los deslindes
router.get('/deslinde', isAuthenticated, isAdmin, deslindeController.getAllDeslindes);

// Actualizar un deslinde
router.put('/deslinde/:id', isAuthenticated, isAdmin, deslindeController.updateDeslinde);

// Eliminar un deslinde
router.delete('/deslinde/:id', isAuthenticated, isAdmin, deslindeController.deleteDeslinde);

// Establecer un deslinde como actual
router.put('/deslinde/:id/set-current', isAuthenticated, isAdmin, deslindeController.setAsCurrentDeslinde);

export default router;
