import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';  // Algorithme GCM pour l'authentification
const KEY = crypto.randomBytes(32); // Clé de 32 bytes pour AES-256

// Chiffrement des données sensibles

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    cipher.setAAD(Buffer.from('additional_data', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Erreur détaillée:', error);
    throw new Error('Erreur de chiffrement');
  }
};




// Déchiffrement des données
const decrypt = (encryptedData) => {
  try {
    const { encrypted, iv, authTag } = encryptedData;
    const decipher = crypto.createDecipher(ALGORITHM, KEY);
    
    decipher.setAAD(Buffer.from('additional_data', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Erreur de déchiffrement');
  }
};

// Hachage sécurisé pour les données sensibles
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Génération de token sécurisé
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Génération d'OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

// Vérification de l'intégrité des données
const verifyIntegrity = (data, hash) => {
  const computedHash = hashData(data);
  return computedHash === hash;
};

export {
  encrypt,
  decrypt,
  hashData,
  generateSecureToken,
  generateOTP,
  verifyIntegrity
};