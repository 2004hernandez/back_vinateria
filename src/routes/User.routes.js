import { Router } from "express";
import * as userController from "../controllers/User.controller.js";
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = Router();

// Rutas públicas
router.post('/signup', userController.signUp); // Registro de usuario
router.post('/login', userController.login); // Inicio de sesión y entrega de token
router.post('/login-admin', userController.loginAdminTest);
router.get('/verify/:token', userController.verifyAccount); // Verificar cuenta por token
router.post('/send-reset-email', userController.sendPasswordResetLink);
router.post('/reset-password/:token', userController.resetPassword); // Restablecer la contraseña

// Rutas protegidas (requieren token de autenticación)
router.get('/profile', userController.getProfile); // Perfil del usuario 
router.get('/check-session', isAuthenticated, userController.checkSession); // Verificar la sesión
router.post('/logout', isAuthenticated, userController.logout); // Cerrar sesión
router.post('/verify-secret-question', userController.verifySecretQuestion);
router.put('/update-profile', userController.updateProfile); // Actualizar perfil (NUEVA RUTA)
router.put('/update-profile/:id', userController.updateProfileAdmin);


// Ruta protegida para obtener todos los usuarios (solo admin)
router.get('/users', isAuthenticated, isAdmin, userController.getAllUsers);
router.get('/users/admins', userController.getAdmins);

// Rutas del admin para ver usuarios recientes y bloqueados
router.get('/admin/recent-users', isAuthenticated, isAdmin, userController.getRecentUsers);
router.get('/admin/recent-blocked', isAuthenticated, isAdmin, userController.getRecentBlockedUsers);
router.get('/admin/failed-login-attempts', isAuthenticated, isAdmin, userController.getFailedLoginAttempts);


// Bloquear usuario
router.post('/admin/block-user', isAuthenticated, isAdmin, userController.blockUser);
// Bloquear usuario por tiempo
router.post('/admin/block-user-temporarily', isAuthenticated, isAdmin, userController.blockUserTemporarily);
// Desbloquear usuario
router.post('/admin/unblock-user', isAuthenticated, isAdmin, userController.unblockUser);

// Ruta del admin para ver inicios de sesión recientes
router.get('/admin/recent-logins', isAuthenticated, isAdmin, userController.getRecentLogins);

router.delete('/admin/users/:id', isAuthenticated, isAdmin, userController.deleteUser);
router.put('/admin/users/:id', isAuthenticated, isAdmin, userController.adminUpdateUser);

export default router;

