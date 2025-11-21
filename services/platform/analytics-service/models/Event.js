import { Point } from '@influxdata/influxdb-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event model for tracking user actions and application events
 */
class Event {
  constructor({
    appId,
    userId,
    eventType,
    eventName,
    properties = {},
    sessionId = null,
    userAgent = null,
    ipAddress = null,
    timestamp = null,
  }) {
    this.appId = appId;
    this.userId = userId;
    this.eventType = eventType;
    this.eventName = eventName;
    this.properties = properties;
    this.sessionId = sessionId || uuidv4();
    this.userAgent = userAgent;
    this.ipAddress = ipAddress;
    this.timestamp = timestamp || Date.now();
  }

  /**
   * Validate event data
   */
  validate() {
    const errors = [];

    if (!this.appId) {
      errors.push('appId is required');
    }

    if (!this.userId) {
      errors.push('userId is required');
    }

    if (!this.eventType) {
      errors.push('eventType is required');
    }

    if (!this.eventName) {
      errors.push('eventName is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert event to InfluxDB Point
   */
  toInfluxPoint() {
    const point = new Point('events')
      .tag('appId', this.appId)
      .tag('userId', this.userId)
      .tag('eventType', this.eventType)
      .tag('eventName', this.eventName)
      .stringField('properties', JSON.stringify(this.properties))
      .timestamp(new Date(this.timestamp));

    if (this.sessionId) {
      point.stringField('sessionId', this.sessionId);
    }

    if (this.userAgent) {
      point.stringField('userAgent', this.userAgent);
    }

    if (this.ipAddress) {
      point.stringField('ipAddress', this.ipAddress);
    }

    return point;
  }

  /**
   * Create Event from plain object
   */
  static fromObject(obj) {
    return new Event(obj);
  }

  /**
   * Create multiple events from array of objects
   */
  static fromArray(arr) {
    return arr.map((obj) => Event.fromObject(obj));
  }
}

export default Event;
