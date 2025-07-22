import { Router } from 'express';
import * as direccionController from '../controllers/Direccion.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
const router = Router();

router.get("/obtener",    isAuthenticated, direccionController.listarDirecciones);
router.post("/crear",   isAuthenticated, direccionController.crearDireccion);
router.put("/actualizar/:id", isAuthenticated, direccionController.actualizarDireccion);
router.delete("/eliminar/:id", isAuthenticated, direccionController.eliminarDireccion);


export default router;