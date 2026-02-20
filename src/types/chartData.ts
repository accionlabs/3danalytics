/**
 * Generic chart data interfaces — visual representation only, no business logic.
 *
 * These types describe what charts need to render, not how data is structured
 * in the API or database. Transformation from domain models to chart data
 * happens at the React component level.
 */

/** Single bar in a bar chart */
export interface BarItem {
  /** Display label (x-axis) */
  label: string
  /** Numeric value (y-axis height) */
  value: number
  /** Optional custom color (hex or CSS color) */
  color?: string
}

/** Single point in a multi-line chart */
export interface LineChartPoint {
  /** X-axis label (date, category, etc.) */
  x: string
  /** Y-values for each line series (key = series name, value = numeric value) */
  [seriesKey: string]: string | number
}

/** Configuration for a line series */
export interface LineSeries {
  /** Data key to extract y-value from LineChartPoint */
  key: string
  /** Display label for legend */
  label: string
  /** Line color (hex or CSS color) */
  color: string
}

/** Single point in an area chart */
export interface AreaChartPoint {
  /** X-axis label */
  x: string
  /** Y-axis value */
  y: number
}

/** Area chart with optional reference line */
export interface AreaChartData {
  /** Data points for the area */
  points: AreaChartPoint[]
  /** Optional horizontal reference line */
  referenceLine?: {
    /** Y-value for the line (required if reference line is shown) */
    value: number
    /** Display label (optional, defaults to "Avg") */
    label?: string
    /** Line color (optional, defaults to orange) */
    color?: string
  }
}

/** Single KPI metric card */
export interface KpiCardItem {
  /** Display label */
  label: string
  /** Pre-formatted display value (e.g., "$45.2k", "1,234", "12.5%") */
  value: string
  /** Optional trend indicator */
  trend?: {
    /** Display value (e.g., "+12%", "-5%") */
    value: string
    /** Visual direction */
    direction: 'up' | 'down' | 'flat'
    /** Trend color (hex or CSS color) */
    color: string
  }
}

/** Single stage in a funnel chart */
export interface FunnelStageItem {
  /** Stage/step label */
  label: string
  /** Count/value for this stage */
  value: number
  /** Optional conversion rate (percentage) */
  conversionRate?: number
  /** Optional custom color */
  color?: string
}

/** Single cohort row in a cohort retention heatmap */
export interface CohortItem {
  /** Cohort label (e.g., date, name) */
  label: string
  /** Retention percentages for each time period */
  retention: number[]
}

/** Single region/category in a geographic chart */
export interface GeoItem {
  /** Region/location label */
  label: string
  /** Primary value (revenue, users, etc.) */
  value: number
  /** Optional secondary metric */
  secondaryValue?: number
  /** Optional custom color */
  color?: string
}

/**
 * Optional field mapping configuration for data transformation.
 * Allows charts to adapt to different data shapes without code changes.
 */
export interface FieldMapping {
  /** Field name for labels/categories */
  labelField?: string
  /** Field name for primary values */
  valueField?: string
  /** Field name for colors */
  colorField?: string
  /** Field name for x-axis (time series) */
  xField?: string
  /** Field name for y-axis */
  yField?: string
  /** Custom formatter for values */
  valueFormatter?: (value: number) => string
}
