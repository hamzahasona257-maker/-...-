import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db, UserInDB } from './db.ts';
import { AdminPermissions } from '../types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'wave-donuts-egypt-secret-key-2026';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
}

export function generateToken(user: UserInDB): string {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (err) {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: UserInDB;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للمتابعة.' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'جلسة العمل منتهية أو غير صالحة. يرجى إعادة تسجيل الدخول.' });
  }

  const user = db.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'حساب المستخدم غير موجود.' });
  }

  if (user.isActive === false) {
    return res.status(403).json({ error: 'هذا الحساب معطل حالياً من قِبل إدارة المتجر.' });
  }

  req.user = user;
  next();
}

// Any admin or owner
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER')) {
      return res.status(403).json({ error: 'عذراً، هذه العملية مخصصة لإدارة المتجر فقط.' });
    }
    next();
  });
}

// Only Owner (Super-Admin)
export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authenticate(req, res, () => {
    if (!req.user || req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'عذراً، هذه العملية تتطلب صلاحيات مالك المتجر الرئيسي (Owner).' });
    }
    next();
  });
}

// Granular permission check
export function requirePermission(permissionKey: keyof AdminPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    authenticate(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً.' });
      }

      // Owner has unconditional super-admin access
      if (req.user.role === 'OWNER') {
        return next();
      }

      // Admin must have explicit permission
      if (req.user.role === 'ADMIN' && req.user.permissions?.[permissionKey]) {
        return next();
      }

      return res.status(403).json({
        error: `ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء (${permissionKey}). تواصل مع مالك المتجر.`,
      });
    });
  };
}
