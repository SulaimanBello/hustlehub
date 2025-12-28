import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { query } from '../config/database';

/**
 * Admin Authentication Middleware
 * Verifies that the authenticated user has admin role
 * Must be used after authenticateToken middleware
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated (should be set by authenticateToken middleware)
    if (!req.user || !req.user.userId) {
      throw new AppError(401, 'Authentication required');
    }

    // Check if user has admin role
    const result = await query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    const user = result.rows[0];

    if (user.role !== 'ADMIN') {
      throw new AppError(
        403,
        'Access denied. Admin privileges required'
      );
    }

    // User is admin, proceed to next middleware/route handler
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional: Check if current user is admin (doesn't throw error)
 * Useful for conditional features
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const result = await query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
