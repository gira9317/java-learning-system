import argon2 from "argon2";
import { pool } from "../db.js";
import type { Role } from "../types/auth.js";

/**
 * アカウントを発行する（研修担当者が使う。scripts/create-user.ts と seed から呼ぶ）。
 * 初期パスワードで作り、初回サインイン時に変更を必須にする。最初のレッスンは解放しておく。
 */
export async function createAccount(input: { employeeNo: string; name: string; password: string; role: Role }) {
  const employeeNo = input.employeeNo.trim().toUpperCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO users (employee_no, name, role, password_hash, must_change_password)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, employee_no, name, role
      `,
      [employeeNo, input.name, input.role, await argon2.hash(input.password)],
    );
    const user = result.rows[0];

    await client.query(
      `
      INSERT INTO lesson_progress (user_id, lesson_id, status)
      SELECT $1, id, 'in-progress'
      FROM lessons
      ORDER BY sort_order
      LIMIT 1
      `,
      [user.id],
    );

    await client.query("COMMIT");
    return user as { id: string; employee_no: string; name: string; role: Role };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
