import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/**
 * Admin Controller
 * Handles all admin dashboard operations
 */

/**
 * GET /api/v1/admin/dashboard
 * Get overview metrics for admin dashboard
 */
export async function getDashboardMetrics(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get all metrics in parallel
    const [
      userStats,
      taskStats,
      transactionStats,
      recentActivity,
    ] = await Promise.all([
      // User statistics
      query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_week,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_month,
          COUNT(*) FILTER (WHERE role = 'ADMIN') as admin_count
        FROM users
      `),

      // Task statistics
      query(`
        SELECT
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'POSTED') as posted_tasks,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED') as active_tasks,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_tasks,
          COUNT(*) FILTER (WHERE status = 'PAID') as paid_tasks,
          COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_tasks,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_tasks_week,
          AVG(fee_amount) as avg_task_fee
        FROM tasks
      `),

      // Transaction statistics
      query(`
        SELECT
          COUNT(*) as total_transactions,
          SUM(amount) FILTER (WHERE type = 'ESCROW_RELEASE' AND status = 'COMPLETED') as total_paid_out,
          SUM(amount) FILTER (WHERE type = 'ESCROW_HOLD' AND status = 'COMPLETED') as total_escrowed,
          SUM(amount) FILTER (WHERE type = 'WITHDRAWAL' AND status = 'COMPLETED') as total_withdrawals,
          COUNT(*) FILTER (WHERE status = 'PENDING') as pending_transactions
        FROM transactions
      `),

      // Recent activity (last 10 tasks)
      query(`
        SELECT
          t.id,
          t.title,
          t.status,
          t.fee_amount,
          t.created_at,
          u.name as poster_name,
          u.phone_number as poster_phone
        FROM tasks t
        JOIN users u ON t.poster_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `),
    ]);

    res.json({
      success: true,
      data: {
        users: userStats.rows[0],
        tasks: taskStats.rows[0],
        transactions: transactionStats.rows[0],
        recent_activity: recentActivity.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/users
 * Get paginated list of users
 */
export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const role = req.query.role as string;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramCounter = 1;

    if (search) {
      whereConditions.push(
        `(name ILIKE $${paramCounter} OR phone_number ILIKE $${paramCounter})`
      );
      params.push(`%${search}%`);
      paramCounter++;
    }

    if (role) {
      whereConditions.push(`role = $${paramCounter}`);
      params.push(role);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const totalUsers = parseInt(countResult.rows[0].count);

    // Get users with stats
    const usersResult = await query(
      `
      SELECT
        u.id,
        u.phone_number,
        u.phone_verified,
        u.name,
        u.role,
        u.created_at,
        COUNT(DISTINCT t_posted.id) as tasks_posted,
        COUNT(DISTINCT t_completed.id) as tasks_completed,
        w.balance,
        w.total_earned,
        w.total_spent
      FROM users u
      LEFT JOIN tasks t_posted ON t_posted.poster_id = u.id
      LEFT JOIN tasks t_completed ON t_completed.doer_id = u.id AND t_completed.status = 'PAID'
      LEFT JOIN wallets w ON w.user_id = u.id
      ${whereClause}
      GROUP BY u.id, w.balance, w.total_earned, w.total_spent
      ORDER BY u.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page,
          limit,
          total: totalUsers,
          total_pages: Math.ceil(totalUsers / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/users/:userId
 * Get detailed user information
 */
export async function getUserDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    // Get user info
    const userResult = await query(
      `
      SELECT
        u.*,
        w.balance,
        w.total_earned,
        w.total_spent,
        w.total_withdrawn
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    // Get user's tasks
    const tasksResult = await query(
      `
      SELECT
        id,
        title,
        status,
        fee_amount,
        created_at,
        'POSTED' as type
      FROM tasks
      WHERE poster_id = $1
      UNION ALL
      SELECT
        id,
        title,
        status,
        fee_amount,
        created_at,
        'COMPLETED' as type
      FROM tasks
      WHERE doer_id = $1
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [userId]
    );

    // Get user's transactions
    const transactionsResult = await query(
      `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.status,
        t.created_at,
        t.metadata
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = $1
      ORDER BY t.created_at DESC
      LIMIT 20
      `,
      [userId]
    );

    res.json({
      success: true,
      data: {
        user: userResult.rows[0],
        tasks: tasksResult.rows,
        transactions: transactionsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/users/:userId/role
 * Update user role
 */
export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      throw new AppError(400, 'Invalid role. Must be USER or ADMIN');
    }

    const result = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [role, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/tasks
 * Get paginated list of tasks with filters
 */
export async function getTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramCounter = 1;

    if (status) {
      whereConditions.push(`t.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }

    if (search) {
      whereConditions.push(`t.title ILIKE $${paramCounter}`);
      params.push(`%${search}%`);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM tasks t ${whereClause}`,
      params
    );
    const totalTasks = parseInt(countResult.rows[0].count);

    // Get tasks
    const tasksResult = await query(
      `
      SELECT
        t.*,
        u_poster.name as poster_name,
        u_poster.phone_number as poster_phone,
        u_doer.name as doer_name,
        u_doer.phone_number as doer_phone
      FROM tasks t
      JOIN users u_poster ON t.poster_id = u_poster.id
      LEFT JOIN users u_doer ON t.doer_id = u_doer.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        tasks: tasksResult.rows,
        pagination: {
          page,
          limit,
          total: totalTasks,
          total_pages: Math.ceil(totalTasks / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/admin/tasks/:taskId/resolve
 * Manually resolve a disputed task
 */
export async function resolveTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { taskId } = req.params;
    const { resolution, reason } = req.body;

    if (!['PAID', 'CANCELLED'].includes(resolution)) {
      throw new AppError(400, 'Resolution must be PAID or CANCELLED');
    }

    if (!reason || reason.trim().length === 0) {
      throw new AppError(400, 'Reason is required for manual resolution');
    }

    // Get task details
    const taskResult = await query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      throw new AppError(404, 'Task not found');
    }

    const task = taskResult.rows[0];

    // Update task status
    await query(
      `UPDATE tasks
       SET status = $1,
           updated_at = NOW(),
           completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE completed_at END
       WHERE id = $2`,
      [resolution, taskId]
    );

    // Handle payment based on resolution
    if (resolution === 'PAID') {
      // Release payment to doer
      const { PaymentService } = await import('../services/payment.service');
      await PaymentService.releaseEscrow(taskId);
    } else if (resolution === 'CANCELLED') {
      // Refund to poster
      const { PaymentService } = await import('../services/payment.service');
      await PaymentService.refundEscrowPayment(taskId);
    }

    // Log the admin action
    await query(
      `INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details)
       VALUES ($1, 'TASK_RESOLUTION', 'TASK', $2, $3)`,
      [req.user!.userId, taskId, JSON.stringify({ resolution, reason })]
    ).catch(() => {
      // Ignore if admin_actions table doesn't exist yet
      console.log('Admin action logging skipped (table may not exist)');
    });

    res.json({
      success: true,
      message: `Task ${resolution.toLowerCase()} by admin`,
      data: { task_id: taskId, resolution, reason },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/transactions
 * Get paginated list of transactions
 */
export async function getTransactions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type as string;
    const status = req.query.status as string;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramCounter = 1;

    if (type) {
      whereConditions.push(`t.type = $${paramCounter}`);
      params.push(type);
      paramCounter++;
    }

    if (status) {
      whereConditions.push(`t.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM transactions t ${whereClause}`,
      params
    );
    const totalTransactions = parseInt(countResult.rows[0].count);

    // Get transactions
    const transactionsResult = await query(
      `
      SELECT
        t.*,
        u.name as user_name,
        u.phone_number as user_phone
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        transactions: transactionsResult.rows,
        pagination: {
          page,
          limit,
          total: totalTransactions,
          total_pages: Math.ceil(totalTransactions / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/admin/analytics
 * Get analytics data for charts
 */
export async function getAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const period = (req.query.period as string) || '7d';

    let interval: string;
    let dateRange: string;

    switch (period) {
      case '24h':
        interval = '1 hour';
        dateRange = '24 hours';
        break;
      case '7d':
        interval = '1 day';
        dateRange = '7 days';
        break;
      case '30d':
        interval = '1 day';
        dateRange = '30 days';
        break;
      case '90d':
        interval = '1 week';
        dateRange = '90 days';
        break;
      default:
        interval = '1 day';
        dateRange = '7 days';
    }

    // Get time-series data for tasks and users
    const [tasksTrend, usersTrend, revenueTrend] = await Promise.all([
      query(`
        SELECT
          date_trunc('${interval}', created_at) as period,
          COUNT(*) as count
        FROM tasks
        WHERE created_at >= NOW() - INTERVAL '${dateRange}'
        GROUP BY period
        ORDER BY period
      `),

      query(`
        SELECT
          date_trunc('${interval}', created_at) as period,
          COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${dateRange}'
        GROUP BY period
        ORDER BY period
      `),

      query(`
        SELECT
          date_trunc('${interval}', created_at) as period,
          SUM(amount) as total
        FROM transactions
        WHERE type = 'ESCROW_HOLD'
          AND status = 'COMPLETED'
          AND created_at >= NOW() - INTERVAL '${dateRange}'
        GROUP BY period
        ORDER BY period
      `),
    ]);

    res.json({
      success: true,
      data: {
        tasks_trend: tasksTrend.rows,
        users_trend: usersTrend.rows,
        revenue_trend: revenueTrend.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}
