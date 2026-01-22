import { calendarService } from '../../src/services/calendar.service';
import { accountModel } from '../../src/models/accountModel';
import { calendarModel } from '../../src/models/calendarModel';
import { google } from 'googleapis';

// モック設定
jest.mock('../../src/models/accountModel');
jest.mock('../../src/models/calendarModel');
jest.mock('googleapis');

describe('CalendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCalendars', () => {
    it('should fetch calendars from Google Calendar API and save to DB', async () => {
      const accountId = 'test-account-id';
      const mockAccount = {
        id: accountId,
        email: 'test@example.com',
        oauth_access_token: 'test-token',
        oauth_refresh_token: 'refresh-token'
      };

      const mockCalendars = [
        { id: 'cal1', summary: 'Calendar 1', accessRole: 'owner' },
        { id: 'cal2', summary: 'Calendar 2', accessRole: 'reader' }
      ];

      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      
      const mockCalendarApi = {
        calendarList: {
          list: jest.fn().mockResolvedValue({
            data: { items: mockCalendars }
          })
        }
      };

      (google.calendar as jest.Mock).mockReturnValue(mockCalendarApi);
      (calendarModel.upsert as jest.Mock).mockResolvedValue({ id: 'cal-id' });

      const result = await calendarService.fetchCalendars(accountId);

      expect(accountModel.findById).toHaveBeenCalledWith(accountId);
      expect(mockCalendarApi.calendarList.list).toHaveBeenCalled();
      expect(calendarModel.upsert).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should throw error if account not found', async () => {
      (accountModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(calendarService.fetchCalendars('invalid-id')).rejects.toThrow('Account not found');
    });

    it('should throw error if account has no access token', async () => {
      const mockAccount = {
        id: 'test-id',
        oauth_access_token: null
      };

      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);

      await expect(calendarService.fetchCalendars('test-id')).rejects.toThrow('Account does not have access token');
    });
  });

  describe('updateCalendarSettings', () => {
    it('should update calendar settings', async () => {
      const calendarId = 'test-calendar-id';
      const settings = {
        sync_enabled: false,
        privacy_mode: 'busy-only'
      };

      (calendarModel.findById as jest.Mock).mockResolvedValue({ id: calendarId });
      (calendarModel.update as jest.Mock).mockResolvedValue({ id: calendarId, ...settings });

      await calendarService.updateCalendarSettings(calendarId, settings);

      expect(calendarModel.findById).toHaveBeenCalledWith(calendarId);
      expect(calendarModel.update).toHaveBeenCalledWith(calendarId, settings);
    });

    it('should throw error if calendar not found', async () => {
      (calendarModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        calendarService.updateCalendarSettings('invalid-id', { sync_enabled: true })
      ).rejects.toThrow('Calendar not found');
    });
  });
});
