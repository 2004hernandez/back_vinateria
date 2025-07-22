import { PrismaClient } from "@prisma/client";
import { transporter } from '../libs/emailConfing.js';

import nodemailer from "nodemailer";

const prisma = new PrismaClient();

// 1) Recibir un nuevo mensaje
export const crearContacto = async (req, res) => {
  try {
    const { motivo, nombre, email, telefono, comentario } = req.body;
    const contacto = await prisma.contacto.create({
      data: { motivo, nombre, email, telefono, comentario }
    });
    return res.status(201).json(contacto);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// 2) Listar todos (admin)
export const listarContactos = async (req, res) => {
  try {
    const todos = await prisma.contacto.findMany({ orderBy: { createdAt: "desc" } });
    return res.json(todos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// 3) Ver uno por ID
export const obtenerContacto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const contacto = await prisma.contacto.findUnique({ where: { id } });
    if (!contacto) return res.status(404).json({ message: "No encontrado" });
    return res.json(contacto);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno" });
  }
};

// 4) Responder y enviar correo
export const responderContacto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { respuesta } = req.body;
    console.log("➡️ responderContacto llamado:", { id, respuesta });

    const contacto = await prisma.contacto.findUnique({ where: { id } });
    if (!contacto) {
      console.log("❌ No se encontró contacto con id", id);
      return res.status(404).json({ message: "No encontrado" });
    }
    console.log("📧 Contacto encontrado:", contacto.email);

    // IMPORTANTE: reutiliza tu transporter (no crees uno nuevo aquí)
    console.log("✉️ Preparando correo…");
    await transporter.sendMail({
      from: `"Soporte" <${process.env.MAILUSER}>`,
      to: contacto.email,
      subject: `Respuesta a tu consulta: ${contacto.motivo}`,
      html: `<p>Hola ${contacto.nombre || ""},</p>
             <p>${respuesta}</p>`
    });
    console.log("✅ Correo enviado");

    console.log("🔄 Marcando como respondido en BD");
    const actualizado = await prisma.contacto.update({
      where: { id },
      data: {
        responded:   true,
        respuesta,
        respondedAt: new Date()
      }
    });
    console.log("✅ Registro actualizado:", actualizado.id);

    return res.json(actualizado);

  } catch (error) {
    console.error("🔥 ERROR en responderContacto:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

