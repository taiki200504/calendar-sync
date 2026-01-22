import { db } from '../utils/database';

export interface ExclusionRule {
  id: string; // uuid
  condition_type: string; // 'title_contains' | 'title_not_contains' | 'location_matches'
  value: string;
  created_at: Date;
  updated_at: Date;
}

class ExclusionRuleModel {
  async findAll(): Promise<ExclusionRule[]> {
    const result = await db.query<ExclusionRule>(
      'SELECT * FROM exclusion_rules ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async findById(id: string): Promise<ExclusionRule | null> {
    const result = await db.query<ExclusionRule>(
      'SELECT * FROM exclusion_rules WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async create(ruleData: {
    condition_type: string;
    value: string;
  }): Promise<ExclusionRule> {
    const result = await db.query<ExclusionRule>(
      `INSERT INTO exclusion_rules (condition_type, value)
       VALUES ($1, $2)
       RETURNING *`,
      [ruleData.condition_type, ruleData.value]
    );
    return result.rows[0];
  }

  async update(id: string, updates: {
    condition_type?: string;
    value?: string;
  }): Promise<ExclusionRule> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.condition_type !== undefined) {
      updateFields.push(`condition_type = $${paramCount++}`);
      values.push(updates.condition_type);
    }

    if (updates.value !== undefined) {
      updateFields.push(`value = $${paramCount++}`);
      values.push(updates.value);
    }

    if (updateFields.length === 0) {
      return this.findById(id) as Promise<ExclusionRule>;
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query<ExclusionRule>(
      `UPDATE exclusion_rules 
       SET ${updateFields.join(', ')} 
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Exclusion rule not found');
    }

    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const result = await db.query(
      'DELETE FROM exclusion_rules WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error('Exclusion rule not found');
    }
  }
}

export const exclusionRuleModel = new ExclusionRuleModel();
