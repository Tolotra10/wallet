import jwt from 'jsonwebtoken';

// Génération du token d'accès
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
    issuer: 'digital-wallet-api',
    audience: 'digital-wallet-app'
  });
};

// Génération du token de rafraîchissement
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'digital-wallet-api',
    audience: 'digital-wallet-app'
  });
};

// Vérification du token d'accès
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token d\'accès invalide');
  }
};

// Vérification du token de rafraîchissement
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Token de rafraîchissement invalide');
  }
};

// Génération d'une paire de tokens
const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRE || '24h'
  };
};

// Extraction du payload sans vérification (pour les tokens expirés)
const decodeToken = (token) => {
  return jwt.decode(token);
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  decodeToken
};