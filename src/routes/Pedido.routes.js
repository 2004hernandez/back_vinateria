import { Router } from 'express';
import * as pedidoController from '../controllers/Pedido.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/crear', isAuthenticated, pedidoController.crearPedido);
router.get('/obtener', pedidoController.obtenerPedidosAdmin);
router.get('/obtener/:email',        pedidoController.obtenerPedidosPorEmail);
router.put('/:id/status', pedidoController.actualizarEstadoPedido);
router.get("/obtener-usuario", isAuthenticated, pedidoController.obtenerPedidosUsuario);

router.put("/confirmar-recibo/:id", isAuthenticated, pedidoController.confirmarRecibo);
router.get("/historial",             isAuthenticated, pedidoController.obtenerHistorialUsuario);
router.get('/:id', isAuthenticated, pedidoController.obtenerPedidoPorId);


export default router;
