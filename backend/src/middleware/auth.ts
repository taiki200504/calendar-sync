import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { accountModel } from '../models/accountModel';
import { AuthenticationError } from '../utils/errors';

export interface AuthRequest extends Request {
  accountId?: string;
  clerkUserId?: string;
}

export const authenticateToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return next(new AuthenticationError('Not authenticated'));
    }

    const clerkUserId = auth.userId;
    (req as AuthRequest).clerkUserId = clerkUserId;

    // Find or create account by clerk_user_id
    let account = await accountModel.findByClerkUserId(clerkUserId);
    if (!account) {
      // Get email from Clerk session claims
      const email = (auth.sessionClaims as any)?.email ||
                    (auth.sessionClaims as any)?.primary_email_address || '';
      account = await accountModel.upsertByClerkUserId({
        clerk_user_id: clerkUserId,
        email,
        provider: 'google',
      });
    }

    (req as AuthRequest).accountId = account.id;
    next();
  } catch (error) {
    next(new AuthenticationError('Not authenticated'));
  }
};
