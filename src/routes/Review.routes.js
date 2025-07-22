import { Router } from "express";
import * as reviewController from "../controllers/Review.controller.js";
import { isAuthenticated } from "../middleware/auth.js";
import { upload } from '../config/cloudinaryConfig.js';

const router = Router();

// Productos que el usuario puede reseñar
router.get("/elegibles", isAuthenticated, reviewController.obtenerElegiblesParaResena);
// Crear reseña
router.post('/reviews',isAuthenticated, upload.array('images', 5), reviewController.crearResena
);

export default router;

