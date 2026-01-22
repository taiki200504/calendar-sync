/**
 * データベースクエリビルダーユーティリティ
 * 動的なUPDATEクエリを安全に構築する
 */

/**
 * UPDATEクエリのフィールドと値のペア
 */
export interface UpdateField {
  field: string;
  value: unknown;
}

/**
 * UPDATEクエリを構築する
 * @param tableName テーブル名
 * @param fields 更新するフィールドと値の配列
 * @param whereClause WHERE句（例: "id = $X"）
 * @param whereValue WHERE句の値
 * @returns SQLクエリ文字列とパラメータ配列
 */
export function buildUpdateQuery(
  tableName: string,
  fields: UpdateField[],
  whereClause: string,
  whereValue: unknown
): { query: string; params: unknown[] } {
  if (fields.length === 0) {
    throw new Error('At least one field must be provided for update');
  }

  const updateFields: string[] = [];
  const params: unknown[] = [];
  let paramCount = 1;

  // 更新フィールドを構築
  for (const { field, value } of fields) {
    if (value !== undefined) {
      updateFields.push(`${field} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  }

  // updated_atを自動的に追加
  updateFields.push(`updated_at = NOW()`);

  // WHERE句のパラメータ番号を調整
  const adjustedWhereClause = whereClause.replace(/\$\d+/, `$${paramCount}`);
  params.push(whereValue);

  const query = `
    UPDATE ${tableName}
    SET ${updateFields.join(', ')}
    WHERE ${adjustedWhereClause}
    RETURNING *
  `.trim();

  return { query, params };
}

/**
 * オブジェクトからUPDATEフィールドを生成
 * @param updates 更新するフィールドのオブジェクト
 * @param fieldMapping フィールド名のマッピング（オプション）
 * @returns UpdateField配列
 */
export function createUpdateFields(
  updates: Record<string, unknown>,
  fieldMapping?: Record<string, string>
): UpdateField[] {
  return Object.entries(updates)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      field: fieldMapping?.[key] || key,
      value
    }));
}
