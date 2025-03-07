import { Response, Request } from 'express';
import { TagModel } from '../../models/entities/TagModel';
import { logger } from '../../utils/logger';

export class PublicTagController {
  private tagModel: TagModel;

  constructor() {
    this.tagModel = new TagModel();
  }

  async getActiveTags(req: Request, res: Response): Promise<void> {
    try {
      const query = `
        SELECT t.*, array_agg(tc.category_id) as subcategories
        FROM tags t
        LEFT JOIN tags_categories tc ON tc.tag_id = t.id
        WHERE t.is_active = true
        GROUP BY t.id
        ORDER BY t.name ASC
      `;

      const result = await this.tagModel.db.query(query);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          ...row,
          possible_values: row.possible_values || [],
          subcategories: row.subcategories || []
        }))
      });
    } catch (error) {
      logger.error('Error in getActiveTags:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const publicTagController = new PublicTagController();
