import { Router } from 'express';
import * as contactoController from '../controllers/contacto.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

router.post   ("/", isAuthenticated,          contactoController.crearContacto);
router.get    ("/", isAuthenticated,  isAdmin, contactoController.listarContactos);
router.get    ("/:id",isAuthenticated, isAdmin, contactoController.obtenerContacto);
router.put    ("/:id/responder",isAuthenticated, isAdmin, contactoController.responderContacto);



export default router;