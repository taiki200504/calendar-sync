import { Router, Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { accountModel } from '../models/accountModel';
import { calendarService } from '../services/calendar.service';
import { logger } from '../utils/logger';
import { AuthRequest, authenticateToken } from '../middleware/auth';

export const authRouter = Router();

/**
 * GET /api/auth/me
 * Return current authenticated user info
 */
authRouter.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const account = await accountModel.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    return res.json({
      id: account.id,
      email: account.email,
      provider: account.provider,
      workspace_flag: account.workspace_flag,
      created_at: account.created_at
    });
  } catch (error: any) {
    logger.error('Error getting current user', { error: error.message });
    return res.status(500).json({ error: 'Failed to get current user' });
  }
});

/**
 * POST /api/auth/setup
 * Called after Clerk sign-in to set up the account and fetch calendars
 */
authRouter.post('/setup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const accountId = (req as AuthRequest).accountId;
    if (!accountId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch calendars from Google
    try {
      const calendars = await calendarService.fetchCalendars(accountId);
      logger.info('Calendars fetched after setup', { accountId, count: calendars.length });
      return res.json({
        success: true,
        calendarsCount: calendars.length
      });
    } catch (err: any) {
      logger.warn('Calendar fetch failed during setup', { accountId, error: err.message });
      return res.json({
        success: true,
        calendarsCount: 0,
        warning: 'Calendar fetch failed. You may need to reconnect your Google account.'
      });
    }
  } catch (error: any) {
    logger.error('Setup error', { error: error.message });
    return res.status(500).json({ error: 'Setup failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side only with Clerk, this is just for cleanup)
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  return res.json({ message: 'Logged out successfully' });
});
