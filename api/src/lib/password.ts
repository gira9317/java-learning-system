import { randomInt } from "node:crypto";

// 見間違えやすい文字（0 / O / 1 / l / I）は使わない
const CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** 研修担当者が受講者に伝える初期パスワード（10 文字） */
export function generateInitialPassword(length = 10) {
  return Array.from({ length }, () => CHARS[randomInt(CHARS.length)]).join("");
}
