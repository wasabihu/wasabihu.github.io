import {AppError,validateDocument} from './core.mjs';
export async function readDocument(env) {
  if (!env.DB) throw new AppError(503,'收藏服务暂时不可用，请稍后重试。');
  const row = await env.DB.prepare('SELECT version,body,updated_at FROM bookmark_document WHERE id = 1').first();
  if (!row) throw new AppError(503,'收藏正在准备中，请稍后再来。');
  return {version:row.version,...JSON.parse(row.body),updatedAt:row.updated_at};
}
export async function writeDocument(env, version, data) {
  if (!Number.isSafeInteger(version) || version < 1) throw new AppError(400,'收藏版本无效，请重新加载。');
  const body = validateDocument(data);
  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare('UPDATE bookmark_document SET body = ?, version = version + 1, updated_at = ? WHERE id = 1 AND version = ?').bind(JSON.stringify(body),updatedAt,version).run();
  if (result.meta.changes !== 1) throw new AppError(409,'其他设备已更新收藏。你的输入已保留，请先重新加载最新收藏后再保存。');
  return {version:version + 1,...body,updatedAt};
}
