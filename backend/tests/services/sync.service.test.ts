import { calendarSyncService } from '../../src/services/sync.service';
import { calendarModel } from '../../src/models/calendarModel';
import { googleCalendarService } from '../../src/services/google-calendar.service';
import { canonicalEventModel } from '../../src/models/canonical-event.model';
import { eventLinkModel } from '../../src/models/event-link.model';
import { db } from '../../src/utils/database';
import { NotFoundError, ValidationError } from '../../src/utils/errors';
import { propagationService } from '../../src/services/propagation.service';

// モック設定
jest.mock('../../src/models/calendarModel');
jest.mock('../../src/services/google-calendar.service');
jest.mock('../../src/models/canonical-event.model');
jest.mock('../../src/models/event-link.model');
jest.mock('../../src/utils/database');
jest.mock('../../src/services/propagation.service');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4')
}));
jest.mock('../../src/utils/event-hash', () => ({
  computeEventHash: jest.fn().mockReturnValue('test-hash'),
  EventLink: {}
}));

describe('SyncService', () => {
  const mockCalendarId = 'test-calendar-id';
  const mockAccountId = 'test-account-id';
  const mockEventId = 'test-event-id';
  const mockCanonicalId = 'test-canonical-id';

  const mockCalendar = {
    id: mockCalendarId,
    account_id: mockAccountId,
    gcal_calendar_id: 'gcal-calendar-id',
    name: 'Test Calendar',
    role: 'owner',
    sync_enabled: true,
    sync_direction: 'bidirectional',
    privacy_mode: 'detail',
    last_sync_cursor: null,
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockGoogleEvent = {
    id: mockEventId,
    summary: 'Test Event',
    start: {
      dateTime: '2024-01-01T10:00:00Z',
      timeZone: 'UTC'
    },
    end: {
      dateTime: '2024-01-01T11:00:00Z',
      timeZone: 'UTC'
    },
    etag: 'test-etag',
    status: 'confirmed'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncCalendar', () => {
    it('should sync calendar successfully', async () => {
      (calendarModel.findById as jest.Mock).mockResolvedValue(mockCalendar);
      (googleCalendarService.listEvents as jest.Mock).mockResolvedValue([mockGoogleEvent]);
      (canonicalEventModel.findById as jest.Mock).mockResolvedValue(null);
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(null);
      (canonicalEventModel.create as jest.Mock).mockResolvedValue({
        id: mockCanonicalId,
        title: 'Test Event',
        start_at: new Date('2024-01-01T10:00:00Z'),
        end_at: new Date('2024-01-01T11:00:00Z')
      });
      (eventLinkModel.upsert as jest.Mock).mockResolvedValue({});
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await calendarSyncService.syncCalendar(mockCalendarId);

      expect(calendarModel.findById).toHaveBeenCalledWith(mockCalendarId);
      expect(googleCalendarService.listEvents).toHaveBeenCalled();
      expect(db.query).toHaveBeenCalled();
    });

    it('should throw NotFoundError if calendar not found', async () => {
      (calendarModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(calendarSyncService.syncCalendar('invalid-id')).rejects.toThrow(NotFoundError);
    });

    it('should skip sync if calendar is not enabled', async () => {
      const disabledCalendar = { ...mockCalendar, sync_enabled: false };
      (calendarModel.findById as jest.Mock).mockResolvedValue(disabledCalendar);

      await calendarSyncService.syncCalendar(mockCalendarId);

      expect(googleCalendarService.listEvents).not.toHaveBeenCalled();
    });
  });

  describe('upsertEvent', () => {
    it('should create new canonical event if not exists', async () => {
      (canonicalEventModel.findById as jest.Mock).mockResolvedValue(null);
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(null);
      (canonicalEventModel.create as jest.Mock).mockResolvedValue({
        id: mockCanonicalId,
        title: 'Test Event',
        start_at: new Date('2024-01-01T10:00:00Z'),
        end_at: new Date('2024-01-01T11:00:00Z')
      });
      (canonicalEventModel.update as jest.Mock).mockResolvedValue({});
      (eventLinkModel.upsert as jest.Mock).mockResolvedValue({});

      await calendarSyncService.upsertEvent(mockGoogleEvent, mockCalendar);

      expect(canonicalEventModel.create).toHaveBeenCalled();
      expect(eventLinkModel.upsert).toHaveBeenCalled();
    });

    it('should throw ValidationError if event has no ID', async () => {
      const eventWithoutId = { ...mockGoogleEvent, id: undefined };

      await expect(
        calendarSyncService.upsertEvent(eventWithoutId as any, mockCalendar)
      ).rejects.toThrow(ValidationError);
    });

    it('should skip update if content hash unchanged', async () => {
      const mockEventLink = {
        id: 'link-id',
        canonical_event_id: mockCanonicalId,
        content_hash: 'test-hash',
        last_synced_at: new Date()
      };

      (canonicalEventModel.findById as jest.Mock).mockResolvedValue({
        id: mockCanonicalId
      });
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(mockEventLink);

      await calendarSyncService.upsertEvent(mockGoogleEvent, mockCalendar);

      expect(canonicalEventModel.update).not.toHaveBeenCalled();
    });

    it('should propagate event when sync is enabled and not readonly', async () => {
      const mockEventLink = {
        id: 'link-id',
        canonical_event_id: mockCanonicalId,
        account_id: mockAccountId,
        calendar_id: mockCalendarId,
        content_hash: 'old-hash',
        last_synced_at: new Date()
      };

      const mockUpdatedEventLink = {
        ...mockEventLink,
        id: 'updated-link-id'
      };

      (canonicalEventModel.findById as jest.Mock).mockResolvedValue({
        id: mockCanonicalId,
        title: 'Test Event',
        start_at: new Date('2024-01-01T10:00:00Z'),
        end_at: new Date('2024-01-01T11:00:00Z')
      });
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(mockEventLink);
      (canonicalEventModel.update as jest.Mock).mockResolvedValue({});
      (eventLinkModel.upsert as jest.Mock).mockResolvedValue(mockUpdatedEventLink);
      (propagationService.propagateEvent as jest.Mock).mockResolvedValue(undefined);

      await calendarSyncService.upsertEvent(mockGoogleEvent, mockCalendar);

      expect(propagationService.propagateEvent).toHaveBeenCalledWith(
        mockCanonicalId,
        mockUpdatedEventLink.id,
        expect.any(String) // syncOpId
      );
    });

    it('should not propagate event when sync_direction is readonly', async () => {
      const readonlyCalendar = {
        ...mockCalendar,
        sync_direction: 'readonly'
      };

      const mockEventLink = {
        id: 'link-id',
        canonical_event_id: mockCanonicalId,
        account_id: mockAccountId,
        calendar_id: mockCalendarId,
        content_hash: 'old-hash',
        last_synced_at: new Date()
      };

      const mockUpdatedEventLink = {
        ...mockEventLink,
        id: 'updated-link-id'
      };

      (canonicalEventModel.findById as jest.Mock).mockResolvedValue({
        id: mockCanonicalId,
        title: 'Test Event',
        start_at: new Date('2024-01-01T10:00:00Z'),
        end_at: new Date('2024-01-01T11:00:00Z')
      });
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(mockEventLink);
      (canonicalEventModel.update as jest.Mock).mockResolvedValue({});
      (eventLinkModel.upsert as jest.Mock).mockResolvedValue(mockUpdatedEventLink);

      await calendarSyncService.upsertEvent(mockGoogleEvent, readonlyCalendar);

      expect(propagationService.propagateEvent).not.toHaveBeenCalled();
    });

    it('should not propagate event when sync is disabled', async () => {
      const disabledCalendar = {
        ...mockCalendar,
        sync_enabled: false
      };

      const mockEventLink = {
        id: 'link-id',
        canonical_event_id: mockCanonicalId,
        account_id: mockAccountId,
        calendar_id: mockCalendarId,
        content_hash: 'old-hash',
        last_synced_at: new Date()
      };

      const mockUpdatedEventLink = {
        ...mockEventLink,
        id: 'updated-link-id'
      };

      (canonicalEventModel.findById as jest.Mock).mockResolvedValue({
        id: mockCanonicalId,
        title: 'Test Event',
        start_at: new Date('2024-01-01T10:00:00Z'),
        end_at: new Date('2024-01-01T11:00:00Z')
      });
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(mockEventLink);
      (canonicalEventModel.update as jest.Mock).mockResolvedValue({});
      (eventLinkModel.upsert as jest.Mock).mockResolvedValue(mockUpdatedEventLink);

      await calendarSyncService.upsertEvent(mockGoogleEvent, disabledCalendar);

      expect(propagationService.propagateEvent).not.toHaveBeenCalled();
    });

    it('should propagate event when sync_direction is writeonly', async () => {
      const writeonlyCalendar = {
        ...mockCalendar,
        sync_direction: 'writeonly'
      };

      const mockEventLink = {
        id: 'link-id',
        canonical_event_id: mockCanonicalId,
        account_id: mockAccountId,
        calendar_id: mockCalendarId,
        content_hash: 'old-hash',
        last_synced_at: new Date()
      };

      const mockUpdatedEventLink = {
        ...mockEventLink,
        id: 'updated-link-id'
      };

      (canonicalEventModel.findById as jest.Mock).mockResolvedValue({
        id: mockCanonicalId,
        title: 'Test Event',
        start_at: new Date('2024-01-01T10:00:00Z'),
        end_at: new Date('2024-01-01T11:00:00Z')
      });
      (eventLinkModel.findByAccountIdAndGcalEventId as jest.Mock).mockResolvedValue(mockEventLink);
      (canonicalEventModel.update as jest.Mock).mockResolvedValue({});
      (eventLinkModel.upsert as jest.Mock).mockResolvedValue(mockUpdatedEventLink);
      (propagationService.propagateEvent as jest.Mock).mockResolvedValue(undefined);

      await calendarSyncService.upsertEvent(mockGoogleEvent, writeonlyCalendar);

      expect(propagationService.propagateEvent).toHaveBeenCalledWith(
        mockCanonicalId,
        mockUpdatedEventLink.id,
        expect.any(String) // syncOpId
      );
    });
  });

  describe('isSelfReflection', () => {
    it('should return true if syncOpId matches', async () => {
      const mockEventLink = {
        id: 'link-id',
        last_sync_op_id: 'test-op-id'
      };

      const eventWithOpId = {
        ...mockGoogleEvent,
        extendedProperties: {
          private: {
            syncOpId: 'test-op-id'
          }
        }
      };

      const result = await calendarSyncService.isSelfReflection(
        mockEventLink as any,
        eventWithOpId
      );

      expect(result).toBe(true);
    });

    it('should return false if syncOpId does not match', async () => {
      const mockEventLink = {
        id: 'link-id',
        last_sync_op_id: 'different-op-id'
      };

      const result = await calendarSyncService.isSelfReflection(
        mockEventLink as any,
        mockGoogleEvent
      );

      expect(result).toBe(false);
    });
  });
});
