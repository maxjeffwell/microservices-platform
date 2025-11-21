import { Point } from '@influxdata/influxdb-client';

/**
 * Metric model for tracking aggregated statistics and measurements
 */
class Metric {
  constructor({
    appId,
    metricName,
    metricType,
    value,
    unit = null,
    tags = {},
    timestamp = null,
  }) {
    this.appId = appId;
    this.metricName = metricName;
    this.metricType = metricType;
    this.value = value;
    this.unit = unit;
    this.tags = tags;
    this.timestamp = timestamp || Date.now();
  }

  /**
   * Validate metric data
   */
  validate() {
    const errors = [];

    if (!this.appId) {
      errors.push('appId is required');
    }

    if (!this.metricName) {
      errors.push('metricName is required');
    }

    if (!this.metricType) {
      errors.push('metricType is required');
    }

    if (this.value === undefined || this.value === null) {
      errors.push('value is required');
    }

    if (typeof this.value !== 'number') {
      errors.push('value must be a number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert metric to InfluxDB Point
   */
  toInfluxPoint() {
    const point = new Point('metrics')
      .tag('appId', this.appId)
      .tag('metricName', this.metricName)
      .tag('metricType', this.metricType)
      .floatField('value', this.value)
      .timestamp(new Date(this.timestamp));

    if (this.unit) {
      point.stringField('unit', this.unit);
    }

    // Add additional tags
    Object.entries(this.tags).forEach(([key, value]) => {
      point.tag(key, value.toString());
    });

    return point;
  }

  /**
   * Create Metric from plain object
   */
  static fromObject(obj) {
    return new Metric(obj);
  }

  /**
   * Create multiple metrics from array of objects
   */
  static fromArray(arr) {
    return arr.map((obj) => Metric.fromObject(obj));
  }
}

export default Metric;
