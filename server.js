import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import auth from './routes/auth.js';
import users from './routes/users.js';
import wallet from './routes/wallet.js';
import adminAuthRoutes from './routes/adminAuth.js';
import orangeRoutes from './routes/orange.js';
import mvolaRoutes from './routes/mvola.js';
import qrCodeRoutes from './routes/qrcode.js';

dotenv.config();

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourapp.com']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Limitation de débit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes depuis cette IP, réessayez plus tard.'
}));

// Middleware
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/wallet', wallet);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/orange', orangeRoutes);
app.use('/api/mvola', mvolaRoutes);
app.use('/api/qrcode', qrCodeRoutes);

// Endpoint test
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Portefeuille Numérique fonctionnelle',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 - catch-all route
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Erreurs globales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

const PORT = process.env.PORT || 3000;

  try {
    // 4. Lancement du serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`📊 Environnement : ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage :', error);
    process.exit(1);
  }


export default app;
