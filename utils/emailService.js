const nodemailer = require('nodemailer');

// Configurar el transporter de nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para verificar la conexión del email
exports.verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Conexión con el servicio de email establecida correctamente');
    return true;
  } catch (error) {
    console.error('Error conectando con el servicio de email:', error);
    return false;
  }
};

// Función principal para enviar emails
exports.sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: `"Sistema de Barbería" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text // Si no hay HTML, usar texto plano
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email enviado correctamente a:', to);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw new Error('No se pudo enviar el email: ' + error.message);
  }
};

// Plantillas
exports.emailTemplates = {
  appointmentConfirmation: (userName, date, time, barberName, serviceName) => ({
    subject: 'Confirmación de cita - Barbería',
    text: `Hola ${userName}, tu cita ha sido confirmada para el ${date} a las ${time} con ${barberName} para ${serviceName}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Confirmación de Cita</h2>
        <p>Hola <strong>${userName}</strong>,</p>
        <p>Tu cita ha sido confirmada con éxito:</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
          <p><strong>Barbero:</strong> ${barberName}</p>
          <p><strong>Servicio:</strong> ${serviceName}</p>
        </div>
        <p>Te esperamos en nuestra barbería. ¡No faltes!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Si necesitas cancelar o modificar tu cita, contáctanos con anticipación.
        </p>
      </div>
    `
  }),

  appointmentReminder: (userName, date, time) => ({
    subject: 'Recordatorio de cita - Barbería',
    text: `Recordatorio: Tienes una cita programada para mañana (${date}) a las ${time}.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Recordatorio de Cita</h2>
        <p>Hola <strong>${userName}</strong>,</p>
        <p>Este es un recordatorio de tu cita programada:</p>
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Hora:</strong> ${time}</p>
        </div>
        <p>¡Te esperamos!</p>
      </div>
    `
  }),

 passwordReset: (userName, resetLink) => ({
    subject: 'Restablecer contraseña - Barbería Pro',
    text: `Hola ${userName},\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace:\n${resetLink}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste este cambio, ignora este email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Barbería Pro</h1>
            <h2>Restablecer Contraseña</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el botón below para crear una nueva contraseña:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Restablecer Contraseña</a>
            </p>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>
            <p><strong>Importante:</strong> Este enlace expirará en 1 hora.</p>
            <p>Si no solicitaste este cambio, puedes ignorar este email de forma segura.</p>
          </div>
          <div class="footer">
            <p>© 2024 Barbería Pro. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};