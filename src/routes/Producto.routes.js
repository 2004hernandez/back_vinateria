import { Router } from 'express';
import { upload } from '../config/cloudinaryConfig.js';
import * as ProductosController from '../controllers/Producto.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();



// Crear producto (sólo admin)
router.post('/crear', upload.array('images'), ProductosController.crearProducto);
router.post('/crearMovil', ProductosController.crearProductoMovil);
router.post('/promociones', ProductosController.crearPromocion);
router.get('/obtenerpromociones', ProductosController.obtenerPromociones);

router.get( '/low-stock', ProductosController.obtenerProductosBajoStock);

router.get('/recomendados', ProductosController.obtenerProductosRecomendados);
// Actualizar producto (sólo admin)
router.put('/:id', isAuthenticated, isAdmin, upload.array('images'), ProductosController.actualizarProducto);
router.put('/sin-imagen/:id', ProductosController.actualizarProductoSinImagen);
// Obtener todos los productos (público)
router.get('/', ProductosController.obtenerProductosAdmin);



// Obtener producto por ID (público)
router.get('/:id',  ProductosController.obtenerProductoPorId);

// Eliminar producto (sólo admin)
router.delete('/:id', isAuthenticated, isAdmin, ProductosController.eliminarProducto);



export default router;


