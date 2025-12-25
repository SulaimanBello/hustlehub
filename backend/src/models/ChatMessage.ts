import { query } from '../config/database';
import { ChatMessage } from '../types';

export class ChatMessageModel {
  /**
   * Create a new chat message
   */
  static async create(
    taskId: string,
    senderId: string,
    message: string
  ): Promise<ChatMessage> {
    const sql = `
      INSERT INTO chat_messages (task_id, sender_id, message)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await query<ChatMessage>(sql, [taskId, senderId, message]);
    return result.rows[0];
  }

  /**
   * Get messages for a task
   */
  static async findByTask(
    taskId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const sql = `
      SELECT * FROM chat_messages
      WHERE task_id = $1
      ORDER BY created_at ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await query<ChatMessage>(sql, [taskId, limit, offset]);
    return result.rows;
  }

  /**
   * Get latest messages for a task
   */
  static async getLatest(taskId: string, count: number = 50): Promise<ChatMessage[]> {
    const sql = `
      SELECT * FROM (
        SELECT * FROM chat_messages
        WHERE task_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      ) AS latest_messages
      ORDER BY created_at ASC
    `;

    const result = await query<ChatMessage>(sql, [taskId, count]);
    return result.rows;
  }

  /**
   * Delete all messages for a task (admin)
   */
  static async deleteByTask(taskId: string): Promise<void> {
    const sql = `DELETE FROM chat_messages WHERE task_id = $1`;
    await query(sql, [taskId]);
  }
}
