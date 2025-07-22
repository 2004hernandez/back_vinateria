import { Router } from 'express';
import * as privacyPolicyController from '../controllers/Politicas.controller.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Crear una política
router.post('/privacy-policy', isAuthenticated, isAdmin, privacyPolicyController.createPrivacyPolicy);

// Obtener la política actual
router.get('/privacy-policy/current', privacyPolicyController.getCurrentPrivacyPolicy);

// Obtener todas las políticas
router.get('/privacy-policy', isAuthenticated, isAdmin, privacyPolicyController.getAllPrivacyPolicies);

// Actualizar una política
router.put('/privacy-policy/:id', isAuthenticated, isAdmin, privacyPolicyController.updatePrivacyPolicy);

// Eliminar una política
router.delete('/privacy-policy/:id', isAuthenticated, isAdmin, privacyPolicyController.deletePrivacyPolicy);

// Establecer una política como actual
router.put('/privacy-policy/:id/set-current', isAuthenticated, isAdmin, privacyPolicyController.setAsCurrentPrivacyPolicy);

export default router;
