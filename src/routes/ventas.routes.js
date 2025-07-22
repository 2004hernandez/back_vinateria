import { Router } from "express";
import * as ventasController from "../controllers/ventas.controller.js";
import { isAuthenticated, isAdmin } from "../middleware/auth.js";


const router = Router();
// GET /ventas/general → Vista general de ventas (solo admin)
router.get("/general", isAuthenticated, isAdmin, ventasController.getVentasGeneral);

router.get("/diarias", isAuthenticated, isAdmin, ventasController. getVentasDiarias);

router.get("/detalles",  isAuthenticated, isAdmin, ventasController.getVentasPorFecha);

export default router;