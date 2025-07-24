import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { transporter } from '../libs/emailConfing.js';

// 🔒 Mejores prácticas de seguridad en Node.js D
// Variables de entorno para SECRET (Evitar claves por defecto en producción)
const prisma = new PrismaClient();
const SECRET = process.env.SECRET || 'super-secret-key'; // ⚠ No almacenar secretos en código fuente
const MAX_FAILED_ATTEMPTS = 5;
const LOGIN_TIMEOUT = 1 * 60 * 1000;
// Registro de usuario y verificación de cuenta
export const signUp = async (req, res) => {
    try {
        const {
            name,
            lastname,
            email,
            telefono,
            fechadenacimiento,
            user,
            preguntaSecreta,
            respuestaSecreta,
            password
        } = req.body;

        if (!name || !lastname || name.length < 3 || lastname.length < 3) {
            return res.status(400).json({ message: "Datos incompletos o inválidos" });
        }

        // Verificar si el correo ya está registrado en la base de datos
        const existingUser = await prisma.usuarios.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: "El correo ya existe" });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generar un token de verificación
        const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });

        // Enlace de verificación
        //const verificationUrl = `https://proyecto-7mo-fronted.vercel.app/verify/${token}`;
        const verificationUrl =`https://front-vinateria.vercel.app/verify/${token}`;


        // Enviar correo de verificación
        await transporter.sendMail({
            from: '"Soporte 👻" <yadi.bta03@gmail.com>',
            to: email,
            subject: "Verifica tu cuenta ✔️",
            html: `
                <p>Hola ${name},</p>
                <p>Haz clic en el enlace para verificar tu cuenta:</p>
                <a href="${verificationUrl}">Verificar Cuenta</a>
                <p>Este enlace expirará en 1 hora.</p>
            `
        });

        // Guardar usuario en la base de datos con Prisma
        await prisma.usuarios.create({
            data: {
                name,
                lastname,
                email,
                telefono,
                fechadenacimiento: new Date(fechadenacimiento), // Convertir a tipo Date
                user,
                preguntaSecreta,
                respuestaSecreta,
                password: hashedPassword,
                verified: false
            }
        });

        // Respuesta exitosa
        res.status(200).json({ message: "Usuario registrado exitosamente. Revisa tu correo para verificar tu cuenta." });
    } catch (error) {
        console.error("Error en signUp:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const verifyAccount = async (req, res) => {
    try {
        const { token } = req.params;

        // Verificar el token
        const decoded = jwt.verify(token, SECRET);

        // Buscar al usuario con el email decodificado desde el token
        const user = await prisma.usuarios.findUnique({
            where: { email: decoded.email }
        });

        if (!user) return res.status(404).json({ message: "Usuario no encontrado." });
        if (user.verified) return res.status(400).json({ message: "La cuenta ya está verificada." });

        // Actualizar usuario para marcarlo como verificado
        await prisma.usuarios.update({
            where: { email: decoded.email },
            data: { verified: true }
        });

        res.status(200).json({ message: "Cuenta verificada exitosamente." });
    } catch (error) {
        console.error("Error al verificar la cuenta:", error.message || error);

        // Verificar si el error es de token expirado o inválido
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ message: "Token expirado." });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ message: "Token inválido." });
        }

        res.status(500).json({ message: "Error interno del servidor al verificar la cuenta." });
    }
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validación mínima
        if (!email || !password) {
            return res.status(400).json({ message: "Correo y contraseña son requeridos" });
        }

        // 1. Buscar al usuario en la tabla "Usuarios" por email
        const user = await prisma.usuarios.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(400).json({ message: "Credenciales invalidas" });
        }

        // 2. Verificar si el usuario está actualmente bloqueado
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
            return res.status(403).json({
                message: `Tu cuenta está bloqueada. Inténtalo de nuevo en ${remainingTime} segundos.`,
            });
        }

        // 3. Comparar contraseñas con bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Incrementar los intentos fallidos
            const newFailedAttempts = user.failedLoginAttempts + 1;

            if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
                // Bloqueo exponencial
                const lockTime = LOGIN_TIMEOUT * Math.pow(2, user.lockCount);
                await prisma.usuarios.update({
                    where: { id: user.id },
                    data: {
                        failedLoginAttempts: newFailedAttempts,
                        lockedUntil: new Date(Date.now() + lockTime),
                        lockCount: user.lockCount + 1,
                    },
                });
                return res.status(403).json({
                    message: "Cuenta bloqueada debido a demasiados intentos fallidos. Inténtalo más tarde.",
                });
            }

            // Aún no alcanza el máximo: solo incrementa
            await prisma.usuarios.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: newFailedAttempts,
                },
            });

            return res.status(400).json({
                message: `Credenciales invalidas. Intentos fallidos: ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS}`,
            });
        }

        // 4. Contraseña correcta -> resetear intentos fallidos y desbloquear
        let updatedUser = await prisma.usuarios.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lockCount: 0,
                lastLogin: new Date(), // Registra el último inicio de sesión
            },
        });

        // 5. Verificar si el usuario está verificado
        if (!updatedUser.verified) {
            return res.status(403).json({
                message: "Tu cuenta aún no ha sido verificada. Revisa tu correo electrónico.",
            });
        }

        // 6.  Registrar el login en la tabla LoginHistory
        // Si quieres limitar a los últimos 10 logins:
        const countHistory = await prisma.loginHistory.count({
            where: { usuarioId: updatedUser.id },
        });
        if (countHistory >= 10) {
            const oldest = await prisma.loginHistory.findMany({
                where: { usuarioId: updatedUser.id },
                orderBy: { loginAt: 'asc' },
                take: 1,
            });
            if (oldest.length > 0) {
                await prisma.loginHistory.delete({ where: { id: oldest[0].id } });
            }
        }
        // Crear un nuevo registro de historial
        await prisma.loginHistory.create({
            data: {
                usuarioId: updatedUser.id,
                loginAt: new Date(), // o se usa el default(now()) de tu schema
            },
        });


        // 7. Generar el token JWT
        const token = jwt.sign(
            { userId: updatedUser.id, role: updatedUser.role, name: updatedUser.name },
            SECRET,
            { expiresIn: '2h' }
        );

        // 8. Guardar el token en una cookie segura
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,  // false en desarrollo, true en producción
            sameSite: 'None',
            path: '/',
            maxAge: 2 * 60 * 60 * 1000,
        });

        // 9. Responder sin incluir el token en el body
        return res.status(200).json({
            message: "Inicio de sesión exitoso",
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                lastLogin: updatedUser.lastLogin,
            },
        });
    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ message: "Error interno del servidor", error });
    }
};

// checkSession

export const checkSession = (req, res) => {
    const { token } = req.cookies;
    if (!token) {
        return res.status(200).json({ isAuthenticated: false });
    }
    try {
        const decoded = jwt.verify(token, SECRET);
        return res.status(200).json({
            isAuthenticated: true,
            user: {
                id: decoded.userId,
                role: decoded.role,
                name: decoded.name,
            },
        });
    } catch (err) {
        return res.status(200).json({ isAuthenticated: false });
    }
};

//cerrar sesion
export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,        // igual que cuando la creaste
    sameSite: 'None',    // igual que cuando la creaste
    path: '/',           // obligatorio si usaste path: '/' en la creación
  });

  return res.status(200).json({ message: "Sesión cerrada con éxito" });
};


export const verifyToken = (req, res, next) => {
    const token = req.headers["x-access-token"] || req.cookies?.token; // Soporta token en headers y cookies

    if (!token) {
        return res.status(403).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = { id: decoded.userId, role: decoded.role }; // Guardar datos en req.user
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expirado" });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Token inválido" });
        } else {
            return res.status(401).json({ message: "No autorizado" });
        }
    }
};

// Obtener todos los usuarios solo para admins
export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.usuarios.findMany({
            select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                telefono: true,
                fechadenacimiento: true,
                user: true,
                preguntaSecreta: true,
                respuestaSecreta: true,
                verified: true,
                role: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                blocked: true,
                lockCount: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                // password NO se incluye por seguridad
            }
        });

        res.status(200).json(users);
    } catch (error) {
        console.error("Error en getAllUsers:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// Resetear contraseña
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        // Verificar el token
        const decoded = jwt.verify(token, SECRET)

        // Buscar al usuario en la base de datos
        const user = await prisma.usuarios.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Validar la contraseña según los requisitos:
        if (password.length < 8 || password.length > 30) {
            return res.status(400).json({ message: "La contraseña debe tener entre 8 y 30 caracteres." });
        }
        if (!/[A-Za-z]/.test(password)) {
            return res.status(400).json({ message: "La contraseña debe contener al menos una letra." });
        }
        if (!/\d/.test(password)) {
            return res.status(400).json({ message: "La contraseña debe contener al menos un número." });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ message: "La contraseña debe contener al menos una letra mayúscula." });
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            return res.status(400).json({ message: "La contraseña debe contener al menos un carácter especial." });
        }

        // Hashear la nueva contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Actualizar la contraseña en la base de datos
        await prisma.usuarios.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: "Contraseña actualizada exitosamente" });

    } catch (error) {
        console.error("Error en resetPassword:", error);

        // Manejo específico de errores de JWT
        if (error.name === "TokenExpiredError") {
            return res.status(400).json({ message: "El token ha expirado" });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(400).json({ message: "Token inválido" });
        }

        res.status(500).json({ message: "Error interno del servidor" });
    }
};



//informacion de usuarios
export const getRecentUsers = async (req, res) => {
    try {
        const recentUsers = await prisma.usuarios.findMany({
            orderBy: { createdAt: "desc" }, // Ordenar por fecha de creación descendente (los más recientes primero)
            take: 5, // Limitar a 5 usuarios
            select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                telefono: true,
                createdAt: true,
            },
        });

        res.status(200).json(recentUsers);
    } catch (error) {
        console.error("Error al obtener usuarios recientes:", error);
        res.status(500).json({ message: "Error al obtener usuarios recientes" });
    }
};

export const getRecentBlockedUsers = async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24 horas

        const recentBlockedUsers = await prisma.usuarios.findMany({
            where: {
                OR: [
                    { lockedUntil: { not: null, gt: new Date() } }, // Bloqueados temporalmente
                    { blocked: true }, // Bloqueados permanentemente
                    { updatedAt: { gte: twentyFourHoursAgo } }, // Desbloqueados recientemente (últimas 24 horas)
                ],
            },
            orderBy: { updatedAt: "desc" }, // Ordenar por última actualización
            take: 10, // Limitar el resultado a 10 usuarios
            select: {
                id: true,
                name: true,
                email: true,
                blocked: true,
                lockedUntil: true,
                updatedAt: true,
            },
        });

        // Enriquecer los datos de los usuarios
        const enrichedData = recentBlockedUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            blockedPermanently: user.blocked,
            lockedUntil: user.lockedUntil,
            currentlyBlocked: user.blocked || (user.lockedUntil && user.lockedUntil > new Date()),
            blockedType: user.blocked
                ? "Permanent"
                : user.lockedUntil && user.lockedUntil > new Date()
                    ? "Temporary"
                    : "None",
            wasRecentlyBlocked: user.updatedAt >= twentyFourHoursAgo,
            lastUpdated: user.updatedAt,
        }));

        res.status(200).json(enrichedData);
    } catch (error) {
        console.error("Error al obtener usuarios bloqueados:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};




export const sendPasswordResetLink = async (req, res) => {
    const { email } = req.body;

    try {
        // Buscar el usuario por email en la base de datos
        const user = await prisma.usuarios.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Verificar si el usuario está bloqueado temporalmente
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
            const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
            return res.status(403).json({
                message: `Tu cuenta está bloqueada. Inténtalo de nuevo en ${remainingTime} segundos.`,
            });
        }

        // Generar un token de restablecimiento de contraseña (expira en 1 hora)
        const token = jwt.sign({ email: user.email, userId: user.id }, SECRET, {
            expiresIn: "1h",
        });

        // Crear el enlace de restablecimiento de contraseña
        const resetUrl = `https://front-vinateria.vercel.app/restorepassword/${token}`;
        //const resetUrl =`http://localhost:3000/restorepassword/${token}`;


        // Enviar el correo con el enlace de restablecimiento de contraseña
        await transporter.sendMail({
            from: '"Soporte 👻" <soporte@tucorreo.com>',  // Cambia el correo de soporte según tu configuración
            to: user.email,
            subject: "Restablece tu contraseña ✔️",
            html: `
                <p>Hola ${user.name},</p>
                <p>Recibimos una solicitud para restablecer tu contraseña. Por favor, haz clic en el siguiente enlace para continuar:</p>
                <a href="${resetUrl}">Restablecer Contraseña</a>
                <p>Este enlace expirará en 1 hora.</p>
            `,
        });

        res.status(200).json({ message: "Correo de restablecimiento enviado con éxito." });

    } catch (error) {
        console.error("Error en sendPasswordResetLink:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};


export const getFailedLoginAttempts = async (req, res) => {
    try {
        const usersWithFailedAttempts = await prisma.usuarios.findMany({
            where: { failedLoginAttempts: { gt: 0 } }, // Filtrar usuarios con intentos fallidos
            orderBy: { failedLoginAttempts: "desc" }, // Ordenar por mayor cantidad de intentos fallidos
            take: 10, // Limitar a 10 usuarios
            select: {
                id: true,
                name: true,
                email: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                updatedAt: true,
            },
        });

        // Enriquecer datos
        const enrichedData = usersWithFailedAttempts.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            failedLoginAttempts: user.failedLoginAttempts,
            lockedUntil: user.lockedUntil,
            lastFailedAttempt: user.updatedAt,
            isLocked: user.lockedUntil && user.lockedUntil.getTime() > Date.now()
        }));

        res.status(200).json(enrichedData);
    } catch (error) {
        console.error("Error al obtener intentos fallidos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};



export const blockUser = async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar que se envíe el ID del usuario
        if (!userId) {
            return res.status(400).json({ message: "ID de usuario es requerido." });
        }

        // Buscar al usuario
        const user = await prisma.usuarios.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Bloquear al usuario de forma permanente
        await prisma.usuarios.update({
            where: { id: userId },
            data: {
                blocked: true,
                lockedUntil: null, // Limpia cualquier bloqueo temporal previo
            },
        });

        res.status(200).json({ message: "Usuario bloqueado permanentemente." });
    } catch (error) {
        console.error("Error al bloquear al usuario:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar que se envíe el ID del usuario
        if (!userId) {
            return res.status(400).json({ message: "ID de usuario es requerido." });
        }

        // Buscar al usuario
        const user = await prisma.usuarios.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Desbloquear al usuario y restablecer valores
        await prisma.usuarios.update({
            where: { id: userId },
            data: {
                lockedUntil: null, // Eliminar bloqueo temporal
                blocked: false, // Eliminar bloqueo permanente
                failedLoginAttempts: 0, // Restablecer intentos fallidos
                lockCount: 0, // Restablecer contador de bloqueos
            },
        });

        res.status(200).json({ message: "Usuario desbloqueado exitosamente." });
    } catch (error) {
        console.error("Error al desbloquear al usuario:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

export const getRecentLogins = async (req, res) => {
    try {
        const recentLogins = await prisma.usuarios.findMany({
            where: { lastLogin: { not: null } }, // Solo usuarios con un inicio de sesión registrado
            orderBy: { lastLogin: "desc" }, // Ordenar por inicio de sesión más reciente
            take: 10, // Limitar a los 10 más recientes
            select: {
                id: true,
                name: true,
                email: true,
                lastLogin: true,
            },
        });

        res.status(200).json(recentLogins);
    } catch (error) {
        console.error("Error al obtener inicios de sesión recientes:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};


export const blockUserTemporarily = async (req, res) => {
    try {
        const { email, lockDuration } = req.body;

        // Verificar que se envíen el correo y la duración
        if (!email || !lockDuration || isNaN(lockDuration) || lockDuration <= 0) {
            return res.status(400).json({ message: "Correo y duración válida de bloqueo son requeridos." });
        }

        // Buscar al usuario por correo
        const user = await prisma.usuarios.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Convertir duración en minutos a milisegundos y calcular el tiempo de desbloqueo
        const lockTimeInMs = lockDuration * 60 * 1000;
        const lockedUntilDate = new Date(Date.now() + lockTimeInMs);

        // Actualizar el usuario en la base de datos
        const updatedUser = await prisma.usuarios.update({
            where: { email },
            data: {
                lockedUntil: lockedUntilDate,
                blocked: false, // Asegurar que no sea un bloqueo permanente
                lockCount: user.lockCount + 1, // Incrementar contador de bloqueos
            },
        });

        return res.status(200).json({
            message: `Usuario bloqueado temporalmente por ${lockDuration} minuto(s).`,
            lockedUntil: updatedUser.lockedUntil,
        });
    } catch (error) {
        console.error("Error al bloquear al usuario temporalmente:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};


// Eliminar usuario (solo admin)
export const deleteUser = async (req, res) => {
    try {
        const userId = Number(req.params.id);

        // Verificar que el usuario existe
        const userToDelete = await prisma.usuarios.findUnique({
            where: { id: userId }
        });

        if (!userToDelete) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Eliminar el usuario
        await prisma.usuarios.delete({
            where: { id: userId }
        });

        return res.status(200).json({ message: "Usuario eliminado correctamente." });

    } catch (error) {
        console.error("Error eliminando usuario:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }

};

export const getProfile = async (req, res) => {
    try {
        const userId = Number(req.userId); // <-- ya existe
        const user = await prisma.usuarios.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                telefono: true,
                fechadenacimiento: true,
                user: true,
                preguntaSecreta: true,
                respuestaSecreta: true,
                verified: true,
                role: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                blocked: true,
                lockCount: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                // password: false // no se puede excluir así, hay que no listarlo
            },
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error("Error obteniendo perfil:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};


export const updateProfile = async (req, res) => {
    try {
        const userId = Number(req.userId);
        const {
            name,
            lastname,
            telefono,
            fechadenacimiento
        } = req.body;

        // Validar que al menos un campo sea proporcionado
        if (!name && !lastname && !telefono && !fechadenacimiento) {
            return res.status(400).json({ message: "Debe proporcionar al menos un campo para actualizar." });
        }

        const updateData = {
            ...(name && { name }),
            ...(lastname && { lastname }),
            ...(telefono && { telefono }),
            ...(fechadenacimiento && { fechadenacimiento: new Date(fechadenacimiento) }),
        };

        const updatedUser = await prisma.usuarios.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                telefono: true,
                fechadenacimiento: true,
                user: true,
                verified: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error actualizando perfil:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};

// Actualizar usuario como admin (puede actualizar más campos)
export const adminUpdateUser = async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const {
            name,
            lastname,
            email,
            telefono,
            fechadenacimiento,
            role,
            blocked,
            verified
        } = req.body;

        // Verificar que el usuario existe
        const existingUser = await prisma.usuarios.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Preparar datos para actualizar
        const updateData = {
            ...(name && { name }),
            ...(lastname && { lastname }),
            ...(email && { email }),
            ...(telefono && { telefono }),
            ...(fechadenacimiento && { fechadenacimiento: new Date(fechadenacimiento) }),
            ...(role && { role }),
            ...(typeof blocked !== 'undefined' && { blocked }),
            ...(typeof verified !== 'undefined' && { verified }),
        };

        // Actualizar el usuario
        const updatedUser = await prisma.usuarios.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                telefono: true,
                fechadenacimiento: true,
                role: true,
                verified: true,
                blocked: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return res.status(200).json(updatedUser);

    } catch (error) {
        console.error("Error actualizando usuario como admin:", error);

        // Manejar error de email único
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            return res.status(400).json({ message: "El email ya está en uso por otro usuario." });
        }

        return res.status(500).json({ message: "Error interno del servidor." });
    }
};




export const verifySecretQuestion = async (req, res) => {
    try {
        const { email, respuestaSecreta, telefono } = req.body;

        // Validación básica
        if (!email || !respuestaSecreta || !telefono) {
            return res.status(400).json({
                success: false,
                message: "Email, respuesta secreta y teléfono son requeridos"
            });
        }

        // Buscar al usuario con los intentos y bloqueos
        const user = await prisma.usuarios.findUnique({
            where: { email },
            select: {
                id: true,
                respuestaSecreta: true,
                telefono: true,
                failedLoginAttempts: true,
                blocked: true,
                lockedUntil: true,
                lockCount: true
            }
        });

        // No revelar si el usuario existe o no
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Datos incorrectos"
            });
        }

        // Verificar bloqueos
        if (user.blocked) {
            return res.status(403).json({
                success: false,
                message: "Cuenta bloqueada permanentemente. Contacte al administrador."
            });
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 1000 / 60);
            return res.status(403).json({
                success: false,
                message: `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos.`
            });
        }

        // Verificar los datos
        const isAnswerCorrect = user.respuestaSecreta.trim().toLowerCase() ===
            respuestaSecreta.trim().toLowerCase();
        const isPhoneCorrect = user.telefono.trim() === telefono.trim();

        if (isAnswerCorrect && isPhoneCorrect) {
            // Resetear intentos fallidos
            if (user.failedLoginAttempts > 0) {
                await prisma.usuarios.update({
                    where: { id: user.id },
                    data: { failedLoginAttempts: 0 }
                });
            }

            // Generar token para cambio de contraseña (válido por 15 minutos)
            const resetToken = jwt.sign(
                {
                    userId: user.id,
                    purpose: 'password_reset_secret_question',
                    email: email
                },
                SECRET,
                { expiresIn: '15m' }
            );

            return res.status(200).json({
                success: true,
                message: "Verificación exitosa",
                token: resetToken // Enviamos el token en la respuesta
            });
        }

        // Manejo de intentos fallidos
        const newAttempts = user.failedLoginAttempts + 1;
        const remainingAttempts = 3 - newAttempts;

        if (newAttempts >= 3) {
            const shouldBlockPermanently = user.lockCount >= 3;

            await prisma.usuarios.update({
                where: { id: user.id },
                data: shouldBlockPermanently ? {
                    blocked: true,
                    failedLoginAttempts: newAttempts
                } : {
                    failedLoginAttempts: newAttempts,
                    lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
                    lockCount: { increment: 1 }
                }
            });

            return res.status(403).json({
                success: false,
                message: shouldBlockPermanently
                    ? "Cuenta bloqueada permanentemente por seguridad."
                    : "Demasiados intentos fallidos. Cuenta bloqueada por 30 minutos."
            });
        }

        // Actualizar intentos fallidos
        await prisma.usuarios.update({
            where: { id: user.id },
            data: { failedLoginAttempts: newAttempts }
        });

        return res.status(400).json({
            success: false,
            message: `Datos incorrectos. Le quedan ${remainingAttempts} intentos.`
        });

    } catch (error) {
        console.error("Error en verifySecretQuestion:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
        });
    }
};
