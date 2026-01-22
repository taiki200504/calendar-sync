import { computeEventHash } from '../../src/utils/event-hash';
import { calendar_v3 } from 'googleapis';

describe('computeEventHash', () => {
  it('should generate consistent hash for same event', () => {
    const event: calendar_v3.Schema$Event = {
      summary: 'Test Event',
      start: {
        dateTime: '2024-01-15T10:00:00Z',
        timeZone: 'UTC'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z',
        timeZone: 'UTC'
      },
      location: 'Tokyo',
      description: 'Test description'
    };

    const hash1 = computeEventHash(event);
    const hash2 = computeEventHash(event);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA256は64文字の16進数
  });

  it('should generate different hash for different events', () => {
    const event1: calendar_v3.Schema$Event = {
      summary: 'Event 1',
      start: {
        dateTime: '2024-01-15T10:00:00Z',
        timeZone: 'UTC'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z',
        timeZone: 'UTC'
      }
    };

    const event2: calendar_v3.Schema$Event = {
      summary: 'Event 2',
      start: {
        dateTime: '2024-01-15T10:00:00Z',
        timeZone: 'UTC'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z',
        timeZone: 'UTC'
      }
    };

    const hash1 = computeEventHash(event1);
    const hash2 = computeEventHash(event2);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle null/undefined values correctly', () => {
    const event: calendar_v3.Schema$Event = {
      summary: 'Test',
      start: {
        dateTime: '2024-01-15T10:00:00Z',
        timeZone: 'UTC'
      },
      end: {
        dateTime: '2024-01-15T11:00:00Z',
        timeZone: 'UTC'
      },
      location: null,
      description: undefined
    };

    const hash = computeEventHash(event);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle all-day events (date instead of dateTime)', () => {
    const event: calendar_v3.Schema$Event = {
      summary: 'All Day Event',
      start: {
        date: '2024-01-15'
      },
      end: {
        date: '2024-01-16'
      }
    };

    const hash = computeEventHash(event);
    expect(hash).toBeDefined();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be case-sensitive for summary', () => {
    const event1: calendar_v3.Schema$Event = {
      summary: 'Test Event',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:00:00Z' }
    };

    const event2: calendar_v3.Schema$Event = {
      summary: 'test event',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:00:00Z' }
    };

    const hash1 = computeEventHash(event1);
    const hash2 = computeEventHash(event2);

    expect(hash1).not.toBe(hash2);
  });

  it('should trim whitespace from text fields', () => {
    const event1: calendar_v3.Schema$Event = {
      summary: 'Test Event',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:00:00Z' }
    };

    const event2: calendar_v3.Schema$Event = {
      summary: '  Test Event  ',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:00:00Z' }
    };

    const hash1 = computeEventHash(event1);
    const hash2 = computeEventHash(event2);

    expect(hash1).toBe(hash2); // トリム後は同じになる
  });
});
