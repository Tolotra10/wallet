import nodemailer from 'nodemailer';
import {Notification} from '../models/Notification.js';
import { User } from '../models/User.js';

// Configuration du transporteur email
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Envoi d'email
const sendEmail = async (to, subject, html, text = null) => {
  try {
    const mailOptions = {
      from: `"MyWallet" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };

    const result = await emailTransporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

// Envoi de SMS (simulation - intégrer avec Twilio ou autre)
const sendSMS = async (phone, message) => {
  try {
    // Simulation d'envoi SMS
    console.log(`SMS envoyé à ${phone}: ${message}`);
    return { success: true, messageId: `sms_${Date.now()}` };
  } catch (error) {
    console.error('Erreur envoi SMS:', error);
    return { success: false, error: error.message };
  }
};

// Envoi de notification push (simulation - intégrer avec FCM)
const sendPushNotification = async (deviceTokens, title, body, data = {}) => {
  try {
    // Simulation d'envoi push
    console.log(`Push notification envoyée à ${deviceTokens.length} appareils:`, { title, body, data });
    return { success: true, messageId: `push_${Date.now()}` };
  } catch (error) {
    console.error('Erreur envoi push:', error);
    return { success: false, error: error.message };
  }
};

// Création et envoi de notification
const createAndSendNotification = async (userId, notificationData) => {
  try {
    // Créer la notification en base
    const notification = await Notification.create({
      user_id: userId,
      ...notificationData
    });

    // Récupérer l'utilisateur pour ses préférences
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const channels = notificationData.channels || ['push'];
    const results = [];

    // Envoi selon les canaux spécifiés
    for (const channel of channels) {
      switch (channel) {
        case 'email':
          if (user.preferences?.notifications?.email) {
            const emailResult = await sendEmail(
              user.email,
              notification.title,
              `<h2>${notification.title}</h2><p>${notification.message}</p>`
            );
            results.push({ channel: 'email', ...emailResult });
          }
          break;

        case 'sms':
          if (user.preferences?.notifications?.sms) {
            const smsResult = await sendSMS(user.phone, notification.message);
            results.push({ channel: 'sms', ...smsResult });
          }
          break;

        case 'push':
          if (user.preferences?.notifications?.push && user.device_tokens?.length > 0) {
            const pushResult = await sendPushNotification(
              user.device_tokens,
              notification.title,
              notification.message,
              { notificationId: notification.id }
            );
            results.push({ channel: 'push', ...pushResult });
          }
          break;
      }
    }

    // Marquer comme envoyée si au moins un canal a réussi
    const hasSuccess = results.some(r => r.success);
    if (hasSuccess) {
      notification.is_sent = true;
      notification.sent_at = new Date();
      await notification.save();
    }

    return {
      notification,
      sendResults: results
    };
  } catch (error) {
    console.error('Erreur création/envoi notification:', error);
    throw error;
  }
};

// Templates d'emails
const emailTemplates = {
  welcome: (firstName) => ({
    subject: 'Bienvenue sur MyWallet !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Bienvenue ${firstName} !</h1>
        <p>Votre compte MyWallet a été créé avec succès.</p>
        <p>Vous pouvez maintenant profiter de tous nos services de paiement numérique.</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Prochaines étapes :</h3>
          <ul>
            <li>Vérifiez votre identité (KYC)</li>
            <li>Ajoutez votre première carte bancaire</li>
            <li>Rechargez votre portefeuille</li>
          </ul>
        </div>
        <p>L'équipe MyWallet</p>
      </div>
    `
  }),

  transactionAlert: (amount, type, description) => ({
    subject: `Transaction ${type === 'credit' ? 'reçue' : 'effectuée'} - ${amount}€`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${type === 'credit' ? '#10B981' : '#EF4444'};">
          Transaction ${type === 'credit' ? 'reçue' : 'effectuée'}
        </h1>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Montant :</strong> ${amount}€</p>
          <p><strong>Description :</strong> ${description}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        <p>Si vous n'êtes pas à l'origine de cette transaction, contactez-nous immédiatement.</p>
        <p>L'équipe MyWallet</p>
      </div>
    `
  }),

  otpCode: (code) => ({
    subject: 'Code de vérification MyWallet',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Code de vérification</h1>
        <p>Voici votre code de vérification à usage unique :</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="font-size: 32px; letter-spacing: 8px; color: #1F2937; margin: 0;">${code}</h2>
        </div>
        <p>Ce code expire dans 10 minutes.</p>
        <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        <p>L'équipe MyWallet</p>
      </div>
    `
  })
};

export {
  sendEmail,
  sendSMS,
  sendPushNotification,
  createAndSendNotification,
  emailTemplates
};