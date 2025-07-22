// src/rutas/logoRoutes.js
import { Router } from 'express';
import * as logoController from '../controllers/Logo.controller.js';

const router = Router();

// Rutas para los logos
router.post('/subir', logoController.subirLogo); // Subir un nuevo logo
router.get('/ultimo', logoController.obtenerUltimoLogo); // Obtener el logo más reciente
router.get('/todos', logoController.obtenerTodosLosLogos); // Obtener todos los logos

export default router;
