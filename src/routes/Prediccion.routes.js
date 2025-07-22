
import { Router } from 'express';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import * as prediccionController from '../controllers/prediccion.controller.js';

const router = Router();
// Solo administradores pueden ver todas las ventas
router.get('/all', isAuthenticated, isAdmin, prediccionController.getAllSales);
// Solo administradores pueden consultarlo
router.get('/top', isAuthenticated, isAdmin, prediccionController.getTopSellingProducts);
router.get('/least', isAuthenticated, isAdmin, prediccionController.getLeastSellingProducts);

// Nueva ruta: datos para la gráfica de stock (stock actual e inicial)
router.get('/products-stock', isAuthenticated, isAdmin, prediccionController.getProductsStockForChart);

export default router;