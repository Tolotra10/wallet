import express from 'express';
import { AdminUser } from '../models/AdminUser.js';
import { authenticateAdmin, authorizeRoles } from '../middleware/auth.js';
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * Création d'un nouvel admin (réservé au super_admin) OK
 */
router.post('/register', authenticateAdmin, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, role = 'admin', permissions = [] } = req.body;

    const newAdmin = await AdminUser.create({
      username,
      email,
      password_hash: password,
      first_name,
      last_name,
      role,
      permissions
    });

    res.status(201).json(newAdmin);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Connexion admin OK
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await AdminUser.findOne({ where: { username } });
    if (!admin) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await admin.validatePassword(password);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    // Mise à jour du dernier login
    admin.last_login = new Date();
    await admin.save();

    // Génération du token
    const token = jwt.sign(
      { id: admin.id, role: admin.role, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Liste des admins OK
router.get('/list', authenticateAdmin, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const admins = await AdminUser.findAll({
      attributes: { exclude: ['password_hash', 'two_factor_secret'] }
    });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Récupérer un admin par ID OK
router.get('/:id', authenticateAdmin, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'two_factor_secret'] }
    });
    if (!admin) return res.status(404).json({ error: 'Admin introuvable' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier un admin OK
router.put('/:id', authenticateAdmin, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const { first_name, last_name, email, role, permissions, is_active, password } = req.body;

    const admin = await AdminUser.findByPk(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin introuvable' });

    if (first_name !== undefined) admin.first_name = first_name;
    if (last_name !== undefined) admin.last_name = last_name;
    if (email !== undefined) admin.email = email;
    if (role !== undefined) admin.role = role;
    if (permissions !== undefined) admin.permissions = permissions;
    if (is_active !== undefined) admin.is_active = is_active;
    if (password) admin.password_hash = password; // sera haché par hook

    await admin.save();

    res.json({ message: 'Admin mis à jour', admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un admin (réservé au super_admin) 
router.delete('/:id', authenticateAdmin, authorizeRoles('super_admin'), async (req, res) => {
  try {
    const admin = await AdminUser.findByPk(req.params.id);
    if (!admin) return res.status(404).json({ error: 'Admin introuvable' });

    await admin.destroy();

    res.json({ message: 'Admin supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// routes/admin.js
router.post('/logout', (req, res) => {
  try {
    // Ici, rien à invalider côté serveur (JWT = stateless)
    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



export default router;
