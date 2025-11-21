import request from 'supertest';
import app from '../index.js';

describe('Analytics Service', () => {
  describe('Health Check', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /analytics/events', () => {
    it('should track a single event', async () => {
      const eventData = {
        appId: 'test-app',
        userId: 'test-user-123',
        eventType: 'user_action',
        eventName: 'test_event',
        properties: {
          testKey: 'testValue',
        },
        async: false,
      };

      const response = await request(app)
        .post('/analytics/events')
        .send(eventData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('event');
      expect(response.body.event).toHaveProperty('appId', 'test-app');
      expect(response.body.event).toHaveProperty('userId', 'test-user-123');
      expect(response.body.event).toHaveProperty('eventName', 'test_event');
    });

    it('should return 400 for invalid event data', async () => {
      const invalidEvent = {
        appId: 'test-app',
        // Missing required fields
      };

      const response = await request(app)
        .post('/analytics/events')
        .send(invalidEvent)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /analytics/events/batch', () => {
    it('should track multiple events', async () => {
      const eventsData = [
        {
          appId: 'test-app',
          userId: 'test-user-123',
          eventType: 'user_action',
          eventName: 'test_event_1',
          properties: {},
        },
        {
          appId: 'test-app',
          userId: 'test-user-456',
          eventType: 'page_view',
          eventName: 'test_event_2',
          properties: {},
        },
      ];

      const response = await request(app)
        .post('/analytics/events/batch')
        .send(eventsData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 2);
    });

    it('should return 400 if request body is not an array', async () => {
      const invalidData = {
        appId: 'test-app',
        userId: 'test-user-123',
      };

      const response = await request(app)
        .post('/analytics/events/batch')
        .send(invalidData)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /analytics/users/:userId/events', () => {
    it('should get events for a user', async () => {
      const userId = 'test-user-123';

      const response = await request(app)
        .get(`/analytics/users/${userId}/events`)
        .query({ limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should filter events by appId', async () => {
      const userId = 'test-user-123';
      const appId = 'test-app';

      const response = await request(app)
        .get(`/analytics/users/${userId}/events`)
        .query({ appId, limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('events');
    });

    it('should return 400 for invalid limit', async () => {
      const userId = 'test-user-123';

      const response = await request(app)
        .get(`/analytics/users/${userId}/events`)
        .query({ limit: 10000 }) // Exceeds max
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /analytics/metrics', () => {
    it('should record a single metric', async () => {
      const metricData = {
        appId: 'test-app',
        metricName: 'test_metric',
        metricType: 'gauge',
        value: 100,
        unit: 'count',
      };

      const response = await request(app)
        .post('/analytics/metrics')
        .send(metricData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('metric');
      expect(response.body.metric).toHaveProperty('metricName', 'test_metric');
      expect(response.body.metric).toHaveProperty('value', 100);
    });

    it('should return 400 for invalid metric data', async () => {
      const invalidMetric = {
        appId: 'test-app',
        metricName: 'test_metric',
        // Missing required fields
      };

      const response = await request(app)
        .post('/analytics/metrics')
        .send(invalidMetric)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for non-numeric value', async () => {
      const invalidMetric = {
        appId: 'test-app',
        metricName: 'test_metric',
        metricType: 'gauge',
        value: 'not-a-number',
      };

      const response = await request(app)
        .post('/analytics/metrics')
        .send(invalidMetric)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /analytics/metrics/batch', () => {
    it('should record multiple metrics', async () => {
      const metricsData = [
        {
          appId: 'test-app',
          metricName: 'response_time',
          metricType: 'timing',
          value: 125.5,
          unit: 'ms',
        },
        {
          appId: 'test-app',
          metricName: 'error_count',
          metricType: 'counter',
          value: 3,
        },
      ];

      const response = await request(app)
        .post('/analytics/metrics/batch')
        .send(metricsData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 2);
    });
  });

  describe('GET /analytics/metrics', () => {
    it('should query metrics', async () => {
      const response = await request(app)
        .get('/analytics/metrics')
        .query({ appId: 'test-app', limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('metrics');
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });

    it('should support aggregation', async () => {
      const response = await request(app)
        .get('/analytics/metrics')
        .query({
          appId: 'test-app',
          aggregation: 'mean',
          window: '1h',
          limit: 10,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
    });

    it('should return 400 for invalid aggregation', async () => {
      const response = await request(app)
        .get('/analytics/metrics')
        .query({ aggregation: 'invalid' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /analytics/dashboards/:appId', () => {
    it('should get dashboard data for an app', async () => {
      const appId = 'test-app';

      const response = await request(app)
        .get(`/analytics/dashboards/${appId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('appId', appId);
      expect(response.body).toHaveProperty('timeRange');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('topEvents');
      expect(response.body).toHaveProperty('recentMetrics');
    });

    it('should support custom time range', async () => {
      const appId = 'test-app';

      const response = await request(app)
        .get(`/analytics/dashboards/${appId}`)
        .query({ startTime: '-7d', endTime: 'now()' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('timeRange');
      expect(response.body.timeRange).toHaveProperty('start', '-7d');
    });
  });
});
