import { transporter } from '../libs/emailConfig.js'; // Asegúrate de la ruta correcta

// Controlador que envía un correo de prueba
export const enviarCorreoPrueba = async (req, res) => {
  try {
    const info = await transporter.sendMail({
      from: '"Soporte 👻" <yadi.bta03@gmail.com>', // Opcional: nombre de remitente
      to: "20220673@uthh.edu.mx", // Cambia esto por un correo de prueba
      subject: "Prueba de Nodemailer ✔️", 
      text: "Este es un correo de prueba desde Nodemailer", 
      html: "<b>Este es un correo de prueba desde Nodemailer</b>",
    });

    console.log("Correo enviado: %s", info.messageId); // Log del ID de mensaje
    res.status(200).json({ message: 'Correo enviado con éxito', id: info.messageId });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ message: 'Error al enviar el correo', error });
  }
};
