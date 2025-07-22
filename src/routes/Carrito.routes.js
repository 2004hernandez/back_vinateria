import { Router } from 'express';
import * as carritoController from '../controllers/carrito.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(isAuthenticated);

// Agregar producto al carrito
router.post('/agregar', carritoController.agregarProductoCarrito);

// Obtener el carrito del usuario actual
router.get('/obtener', carritoController.obtenerCarrito);

// Actualizar cantidad de un producto en el carrito
router.put('/actualizar/:id', carritoController.actualizarCantidadCarrito);
// Eliminar producto del carrito
router.delete('/eliminar/:id', carritoController.eliminarProductoCarrito);



// Vaciar todo el carrito
//router.delete('/vaciar', CarritoController.vaciarCarrito);


export default router;