import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, JWTPayload } from '../types';
import config from '../config';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AppError(401, 'Authentication token required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Attach user data to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid or expired token'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present but doesn't require it
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}
