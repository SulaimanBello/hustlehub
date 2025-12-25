import { query } from '../config/database';
import { Task, TaskStatus, CreateTaskRequest, NearbyTasksQuery } from '../types';
import config from '../config';

export class TaskModel {
  /**
   * Create a new task
   */
  static async create(data: CreateTaskRequest & { poster_id: string }): Promise<Task> {
    const sql = `
      INSERT INTO tasks (poster_id, title, description, latitude, longitude, fee_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query<Task>(sql, [
      data.poster_id,
      data.title,
      data.description,
      data.latitude,
      data.longitude,
      data.fee_amount,
      TaskStatus.POSTED,
    ]);

    return result.rows[0];
  }

  /**
   * Find task by ID
   */
  static async findById(id: string): Promise<Task | null> {
    const sql = `SELECT * FROM tasks WHERE id = $1`;
    const result = await query<Task>(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find nearby tasks (geo-query using PostGIS)
   */
  static async findNearby(params: NearbyTasksQuery): Promise<Task[]> {
    const radiusMeters = (params.radius_km || config.business.defaultTaskRadiusKm) * 1000;
    const limit = params.limit || 20;

    const sql = `
      SELECT *
      FROM tasks
      WHERE status = $1
        AND ST_DWithin(
          ST_MakePoint(longitude, latitude)::geography,
          ST_MakePoint($2, $3)::geography,
          $4
        )
      ORDER BY created_at DESC
      LIMIT $5
    `;

    const result = await query<Task>(sql, [
      TaskStatus.POSTED,
      params.longitude,
      params.latitude,
      radiusMeters,
      limit,
    ]);

    return result.rows;
  }

  /**
   * Find tasks posted by user
   */
  static async findByPoster(posterId: string): Promise<Task[]> {
    const sql = `
      SELECT * FROM tasks
      WHERE poster_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query<Task>(sql, [posterId]);
    return result.rows;
  }

  /**
   * Find tasks accepted/completed by user
   */
  static async findByDoer(doerId: string): Promise<Task[]> {
    const sql = `
      SELECT * FROM tasks
      WHERE doer_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query<Task>(sql, [doerId]);
    return result.rows;
  }

  /**
   * Accept a task
   */
  static async accept(taskId: string, doerId: string): Promise<Task | null> {
    const sql = `
      UPDATE tasks
      SET status = $1, doer_id = $2
      WHERE id = $3 AND status = $4 AND doer_id IS NULL
      RETURNING *
    `;

    const result = await query<Task>(sql, [
      TaskStatus.ACCEPTED,
      doerId,
      taskId,
      TaskStatus.POSTED,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Mark task as completed (by doer)
   */
  static async markCompleted(taskId: string, doerId: string): Promise<Task | null> {
    const sql = `
      UPDATE tasks
      SET status = $1, completed_at = NOW()
      WHERE id = $2 AND doer_id = $3 AND status = $4
      RETURNING *
    `;

    const result = await query<Task>(sql, [
      TaskStatus.COMPLETED,
      taskId,
      doerId,
      TaskStatus.ACCEPTED,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Mark task as paid (after payment release)
   */
  static async markPaid(taskId: string): Promise<Task | null> {
    const sql = `
      UPDATE tasks
      SET status = $1
      WHERE id = $2 AND status = $3
      RETURNING *
    `;

    const result = await query<Task>(sql, [TaskStatus.PAID, taskId, TaskStatus.COMPLETED]);

    return result.rows[0] || null;
  }

  /**
   * Cancel a task (only if not accepted)
   */
  static async cancel(taskId: string, posterId: string): Promise<Task | null> {
    const sql = `
      UPDATE tasks
      SET status = $1
      WHERE id = $2 AND poster_id = $3 AND status = $4
      RETURNING *
    `;

    const result = await query<Task>(sql, [
      TaskStatus.CANCELLED,
      taskId,
      posterId,
      TaskStatus.POSTED,
    ]);

    return result.rows[0] || null;
  }

  /**
   * Update task status (admin override)
   */
  static async updateStatus(taskId: string, status: TaskStatus): Promise<Task | null> {
    const sql = `
      UPDATE tasks
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await query<Task>(sql, [status, taskId]);
    return result.rows[0] || null;
  }
}
