import { Router, Request, Response } from 'express';
import { freebusyService, FreeBusySearchParams } from '../services/freebusy.service';
import { authenticateToken, AuthRequest } from '../middleware/auth';

export const freebusyRouter = Router();

// 認証ミドルウェアを適用
freebusyRouter.use(authenticateToken);

// 空き時間検索
freebusyRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const {
      accountIds,
      startDate,
      endDate,
      duration,
      workingHours,
      buffer,
      travelTime,
      preferredDays,
    } = req.body;

    // バリデーション
    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: 'accountIds is required and must be a non-empty array' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    if (!duration || typeof duration !== 'number' || duration <= 0) {
      return res.status(400).json({ error: 'duration is required and must be a positive number' });
    }

    // 日付をDateオブジェクトに変換
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (start >= end) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    const params: FreeBusySearchParams = {
      accountIds,
      startDate: start,
      endDate: end,
      duration,
      workingHours,
      buffer,
      travelTime,
      preferredDays,
    };

    const slots = await freebusyService.findFreeSlots(accountId, params);

    return res.json({ slots });
  } catch (error: any) {
    console.error('FreeBusy search error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to search free slots',
    });
  }
});
