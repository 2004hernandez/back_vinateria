import config from "../config.js";  // Importamos las credenciales
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",  // Servidor SMTP de Gmail
  port: 465,               // Puerto seguro para SSL
  secure: true,            // Aseguramos la conexión con SSL
  auth: {
    user: config.MAILUSER, // Tu correo
    pass: config.MAILPASS, // App Password
  },
});
