// middleware/auth.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const isAuthenticated = (req, res, next) => {
    
    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ message: "Acceso denegado: falta el token de autenticación" });
    }
    try {
        const decoded = jwt.verify(token, SECRET);
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};


export const isAdmin = (req, res, next) => {
    // Ahora req.role viene de la línea anterior
    if (req.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Acceso denegado: requiere rol de administrador" });
    }
};
