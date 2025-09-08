import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Upload,
  FileText,
  BarChart3,
  Download,
  Eye,
  Trash2,
  TrendingUp,
  PieChart,
  LineChart,
  BarChart,
  Activity,
  RefreshCw,
  Settings,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

/**
 * @module FileToChart
 * @description This module provides a comprehensive React component for uploading data files (CSV, JSON, TSV)
 * and generating interactive charts using Chart.js. It includes robust error handling,
 * dynamic chart configuration, and enhanced user experience features.
 */

/**
 * Suppresses ResizeObserver errors which are common with Chart.js in responsive containers.
 * This function adds a global error handler to prevent these specific errors from
 * propagating and cluttering the console.
 * @returns {() => void} A cleanup function to remove the error handler.
 */
const suppressResizeObserverError = (): (() => void) => {
  const errorHandler = (event: ErrorEvent): boolean => {
    const resizeObserverErrors = [
      'ResizeObserver loop completed with undelivered notifications.',
      'ResizeObserver loop limit exceeded'
    ];

    if (resizeObserverErrors.some(error => event.message.includes(error))) {
      event.stopImmediatePropagation();
      return false;
    }
    return true;
  };

  window.addEventListener('error', errorHandler);
  return () => window.removeEventListener('error', errorHandler);
};

/**
 * @interface ChartDataset
 * @description Defines the structure for a single dataset within a Chart.js chart.
 */
interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor: string | string[];
  borderWidth: number;
  tension?: number; // Applicable for 'line' chart types
  fill?: boolean; // Applicable for 'area' chart types
}

/**
 * @interface ChartData
 * @description Defines the overall data structure required by Chart.js.
 */
interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * @interface UploadedFile
 * @description Represents the metadata and parsed content of an uploaded data file.
 */
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
  data: Record<string, any>[];
  columns: string[];
  rowCount: number;
  preview: Record<string, any>[];
}

/**
 * @interface ChartConfig
 * @description Defines the configurable options for the generated chart.
 */
interface ChartConfig {
  type: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend: boolean;
  showGrid: boolean;
  responsive: boolean;
}

/**
 * @interface StatusMessage
 * @description Defines the structure for a user-facing status or notification message.
 */
interface StatusMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  duration?: number; // Duration in milliseconds for auto-dismissal
}

/**
 * @constant CHART_TYPES
 * @description An array of predefined chart types with associated metadata for display and selection.
 */
const CHART_TYPES = [
  {
    type: 'bar',
    name: 'Bar Chart',
    icon: BarChart,
    description: 'Compares discrete categories using vertical bars.',
    bestFor: 'Categorical data comparison'
  },
  {
    type: 'horizontalBar',
    name: 'Horizontal Bar',
    icon: BarChart3,
    description: 'Compares discrete categories using horizontal bars, ideal for long labels.',
    bestFor: 'Categorical data with long names'
  },
  {
    type: 'line',
    name: 'Line Chart',
    icon: LineChart,
    description: 'Displays trends and changes over a continuous period or ordered categories.',
    bestFor: 'Time series data or trends'
  },
  {
    type: 'area',
    name: 'Area Chart',
    icon: Activity,
    description: 'A line chart with the area below the line filled, showing volume or cumulative totals.',
    bestFor: 'Volume or cumulative data'
  },
  {
    type: 'pie',
    name: 'Pie Chart',
    icon: PieChart,
    description: 'Illustrates proportions of a whole, where each slice represents a category.',
    bestFor: 'Proportional data (parts of a whole)'
  },
  {
    type: 'doughnut',
    name: 'Donut Chart',
    icon: PieChart,
    description: 'Similar to a pie chart but with a central cutout, often used for emphasis.',
    bestFor: 'Proportional data with emphasis'
  },
  {
    type: 'scatter',
    name: 'Scatter Plot',
    icon: TrendingUp,
    description: 'Shows the relationship between two numerical variables.',
    bestFor: 'Correlation and distribution analysis'
  }
] as const;

/**
 * @constant COLOR_PALETTES
 * @description Predefined color palettes for chart visualization, offering different aesthetic options.
 */
const COLOR_PALETTES = {
  vibrant: [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ],
  pastel: [
    '#93C5FD', '#FCA5A5', '#6EE7B7', '#FCD34D', '#C4B5FD',
    '#67E8F9', '#FDBA74', '#BEF264', '#F9A8D4', '#9CA3AF'
  ],
  professional: [
    '#1E40AF', '#DC2626', '#059669', '#D97706', '#7C3AED',
    '#0891B2', '#EA580C', '#65A30D', '#DB2777', '#4B5563'
  ]
};

/**
 * @class FileProcessor
 * @description A utility class for parsing and processing different file formats (CSV, JSON).
 * It handles data extraction, header identification, and value type conversion.
 */
class FileProcessor {
  /**
   * Processes a CSV string into an array of objects and extracts headers.
   * @param {string} text - The CSV content as a string.
   * @returns {Promise<{ headers: string[]; data: Record<string, any>[] }>} An object containing headers and parsed data.
   * @throws {Error} If the CSV format is invalid or contains insufficient data.
   */
  static async processCSV(text: string): Promise<{ headers: string[]; data: Record<string, any>[] }> {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row.');
    }

    const headers = this.parseCSVLine(lines[0]);
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue; // Skip empty lines

      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        row[header] = this.parseValue(value);
      });
      data.push(row);
    }

    return { headers, data };
  }

  /**
   * Processes a JSON string into an array of objects and extracts headers.
   * Handles both array and single object JSON structures.
   * @param {string} text - The JSON content as a string.
   * @returns {Promise<{ headers: string[]; data: Record<string, any>[] }>} An object containing headers and parsed data.
   * @throws {Error} If the JSON format is invalid or contains no data.
   */
  static async processJSON(text: string): Promise<{ headers: string[]; data: Record<string, any>[] }> {
    let jsonData: any;

    try {
      jsonData = JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid JSON format. Please ensure the file contains valid JSON.');
    }

    const data = Array.isArray(jsonData) ? jsonData : [jsonData];

    if (data.length === 0) {
      throw new Error('JSON file contains no data. Please provide a file with data entries.');
    }

    // Extract headers from all objects to handle varying structures
    const headerSet = new Set<string>();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => headerSet.add(key));
      }
    });

    const headers = Array.from(headerSet);

    // Normalize data to ensure all objects have all headers
    const normalizedData = data.map(item => {
      const normalizedItem: Record<string, any> = {};
      headers.forEach(header => {
        normalizedItem[header] = this.parseValue(item[header]);
      });
      return normalizedItem;
    });

    return { headers, data: normalizedData };
  }

  /**
   * Parses a single line of CSV, handling quoted fields and escaped quotes.
   * @private
   * @param {string} line - The CSV line to parse.
   * @returns {string[]} An array of parsed values.
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Attempts to convert a string value to its appropriate data type (boolean, number, date)
   * or returns it as a string if no conversion is possible.
   * @private
   * @param {any} value - The value to parse.
   * @returns {any} The parsed value (boolean, number, Date, or string).
   */
  private static parseValue(value: any): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const str = String(value).trim();

    // Check for boolean values
    if (str.toLowerCase() === 'true') return true;
    if (str.toLowerCase() === 'false') return false;

    // Check for numbers
    // Use Number.isFinite to exclude Infinity, -Infinity, and NaN
    if (!isNaN(Number(str)) && Number.isFinite(parseFloat(str))) {
      const num = parseFloat(str);
      return Number.isInteger(num) ? parseInt(str, 10) : num;
    }

    // Check for dates (basic ISO format YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(str)) {
      const date = new Date(str);
      if (!isNaN(date.getTime())) return date;
    }

    return str;
  }
}

/**
 * @function FileToChart
 * @description The main React functional component for the chart builder application.
 * It manages file uploads, data processing, chart configuration, and rendering.
 * @returns {JSX.Element} The rendered FileToChart component.
 */
export default function FileToChart(): JSX.Element {
  // State Management
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartInstance, setChartInstance] = useState<any>(null); // Chart.js instance
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    showLegend: true,
    showGrid: true,
    responsive: true
  });
  const [selectedColumns, setSelectedColumns] = useState({
    label: '', // Column for chart labels (e.g., X-axis categories)
    value: '', // Column for chart values (e.g., Y-axis numerical data)
    series: '' // Optional column for grouping data into multiple series
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChartReady, setIsChartReady] = useState<boolean>(false);
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [colorPalette, setColorPalette] = useState<keyof typeof COLOR_PALETTES>('vibrant');

  // Refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * @effect Initializes global error suppression for ResizeObserver.
   * Cleans up the error handler on component unmount.
   */
  useEffect(() => {
    const cleanup = suppressResizeObserverError();
    return cleanup;
  }, []);

  /**
   * @memoized currentColors
   * @description Memoizes the currently selected color palette for efficient access.
   */
  const currentColors = useMemo(() => COLOR_PALETTES[colorPalette], [colorPalette]);

  /**
   * @memoized fileStats
   * @description Computes statistics about the selected file's columns (numeric vs. categorical).
   * This helps in guiding column selection for chart generation.
   */
  const fileStats = useMemo(() => {
    if (!selectedFile) return null;

    const numerics = selectedFile.columns.filter(col =>
      selectedFile.data.some(row => typeof row[col] === 'number')
    );
    const categoricals = selectedFile.columns.filter(col =>
      !numerics.includes(col)
    );

    return { numerics, categoricals, total: selectedFile.columns.length };
  }, [selectedFile]);

  /**
   * @function addStatusMessage
   * @description Adds a new status message to the display queue. Messages can be
   * automatically dismissed after a specified duration.
   * @param {string} message - The content of the message.
   * @param {StatusMessage['type']} type - The type of message ('success', 'error', 'warning', 'info').
   * @param {number} [duration=5000] - The duration in milliseconds before the message is dismissed.
   */
  const addStatusMessage = useCallback((
    message: string,
    type: StatusMessage['type'],
    duration: number = 5000
  ): void => {
    const id = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: StatusMessage = {
      id,
      type,
      message,
      timestamp: new Date(),
      duration
    };

    setStatusMessages(prev => [...prev, newMessage]);

    if (duration > 0) {
      setTimeout(() => {
        setStatusMessages(prev => prev.filter(msg => msg.id !== id));
      }, duration);
    }
  }, []);

  /**
   * @function removeStatusMessage
   * @description Removes a specific status message from the display queue.
   * @param {string} id - The unique identifier of the message to remove.
   */
  const removeStatusMessage = useCallback((id: string): void => {
    setStatusMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  /**
   * @function processDataForChart
   * @description Transforms raw uploaded data into a Chart.js compatible format.
   * It handles data aggregation, grouping by series, and value type determination.
   * @param {Record<string, any>[]} data - The raw data array from the uploaded file.
   * @param {string} labelCol - The column name to be used for chart labels.
   * @param {string} valueCol - The column name to be used for chart values.
   * @param {string} [seriesCol] - Optional column name for creating multiple data series.
   * @returns {ChartData | null} The formatted chart data or null if processing fails.
   */
  const processDataForChart = useCallback((
    data: Record<string, any>[],
    labelCol: string,
    valueCol: string,
    seriesCol?: string
  ): ChartData | null => {
    if (!data || !labelCol || !valueCol) {
      addStatusMessage('Missing label or value column for chart data processing.', 'warning');
      return null;
    }

    try {
      const groupedData = new Map<string, Map<string, number>>();
      // Determine if the value column contains numeric data for sum aggregation
      const isNumericValue = data.some(row => typeof row[valueCol] === 'number');

      // Process data with grouping support, limiting to first 1000 rows for performance
      data.slice(0, 1000).forEach(row => {
        const label = String(row[labelCol] || 'Unknown').trim();
        const series = seriesCol ? String(row[seriesCol] || 'Default').trim() : 'Default';

        if (!groupedData.has(label)) {
          groupedData.set(label, new Map());
        }

        const seriesMap = groupedData.get(label)!;

        if (isNumericValue) {
          const value = Number(row[valueCol]) || 0; // Default to 0 if not a valid number
          seriesMap.set(series, (seriesMap.get(series) || 0) + value);
        } else {
          // For non-numeric values, count occurrences
          seriesMap.set(series, (seriesMap.get(series) || 0) + 1);
        }
      });

      // Convert aggregated data to Chart.js format
      const labels = Array.from(groupedData.keys()).slice(0, 50); // Limit labels to 50 for readability
      const seriesNames = Array.from(
        new Set(
          Array.from(groupedData.values())
            .flatMap(seriesMap => Array.from(seriesMap.keys()))
        )
      );

      const datasets: ChartDataset[] = seriesNames.map((seriesName, index) => {
        const datasetData = labels.map(label => {
          const seriesMap = groupedData.get(label);
          return seriesMap?.get(seriesName) || 0;
        });

        const baseColor = currentColors[index % currentColors.length];
        const backgroundColor = chartConfig.type === 'line' || chartConfig.type === 'area'
          ? `${baseColor}20` // Lighter fill for line/area charts
          : `${baseColor}80`; // Solid fill for other charts

        return {
          label: seriesCol ? seriesName : (isNumericValue ? `${valueCol} (Sum)` : `${valueCol} (Count)`),
          data: datasetData,
          backgroundColor: Array.isArray(backgroundColor) ? backgroundColor : Array(datasetData.length).fill(backgroundColor),
          borderColor: Array(datasetData.length).fill(baseColor),
          borderWidth: 2,
          tension: chartConfig.type === 'line' ? 0.4 : 0, // Smooth lines for line charts
          fill: chartConfig.type === 'area' // Fill area for area charts
        };
      });

      return { labels, datasets };
    } catch (error: any) {
      addStatusMessage(`Error processing data for chart: ${error.message || error}`, 'error');
      return null;
    }
  }, [currentColors, chartConfig.type, addStatusMessage]);

  /**
   * @function createChart
   * @description Initializes or updates the Chart.js instance on the canvas.
   * This function is responsible for rendering the chart based on the provided data and configuration.
   * It dynamically imports Chart.js for better bundle splitting.
   * @param {ChartData} data - The data to be displayed in the chart.
   */
  const createChart = async (data: ChartData): Promise<void> => {
    if (!data || !canvasRef.current) {
      addStatusMessage('Chart data or canvas element is not available.', 'warning');
      return;
    }

    try {
      setIsChartReady(false); // Indicate that chart is being generated

      // Dynamic import for Chart.js to reduce initial bundle size
      const Chart = (await import('chart.js/auto')).default;

      // Destroy any existing Chart.js instance to prevent memory leaks and conflicts
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }
      const existingChart = Chart.getChart(canvasRef.current);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to get 2D rendering context from canvas element.');
      }

      // Adjust chart type for Chart.js if 'horizontalBar' is selected
      const chartType = chartConfig.type === 'horizontalBar' ? 'bar' : chartConfig.type;

      const config: any = {
        type: chartType,
        data: {
          labels: data.labels,
          datasets: data.datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Allow canvas to fill parent container
          indexAxis: chartConfig.type === 'horizontalBar' ? 'y' : 'x', // Swap axes for horizontal bar chart
          interaction: {
            intersect: false, // Tooltips show for nearest item, not just intersected
            mode: 'index' // Show tooltips for all items at the same index
          },
          plugins: {
            title: {
              display: !!chartConfig.title,
              text: chartConfig.title || `${data.datasets[0]?.label || 'Chart'}`,
              font: { size: 16, weight: 'bold' },
              color: '#334155' // slate-700
            },
            legend: {
              display: chartConfig.showLegend && (['pie', 'doughnut'].includes(chartConfig.type) || data.datasets.length > 1),
              position: 'top',
              labels: {
                color: '#475569' // slate-600
              }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)', // slate-900 with opacity
              titleColor: '#F8FAFC', // slate-50
              bodyColor: '#F8FAFC',
              cornerRadius: 6,
              padding: 10
            }
          },
          scales: !['pie', 'doughnut'].includes(chartConfig.type) ? {
            y: {
              beginAtZero: true,
              title: {
                display: !!chartConfig.yAxisLabel || !!selectedColumns.value,
                text: chartConfig.yAxisLabel || selectedColumns.value || 'Values',
                color: '#475569'
              },
              grid: {
                display: chartConfig.showGrid,
                color: '#E2E8F0' // slate-200
              },
              ticks: {
                color: '#64748B' // slate-500
              }
            },
            x: {
              title: {
                display: !!chartConfig.xAxisLabel || !!selectedColumns.label,
                text: chartConfig.xAxisLabel || selectedColumns.label || 'Labels',
                color: '#475569'
              },
              grid: {
                display: chartConfig.showGrid,
                color: '#E2E8F0'
              },
              ticks: {
                color: '#64748B'
              }
            }
          } : undefined // Scales are not applicable for pie/doughnut charts
        }
      };

      const newChart = new Chart(ctx, config);

      // A small delay to ensure Chart.js has fully rendered before marking as ready
      setTimeout(() => {
        setChartInstance(newChart);
        setIsChartReady(true);
        addStatusMessage('Chart created successfully!', 'success', 3000);
      }, 100);

    } catch (error: any) {
      console.error('Chart creation error:', error);
      addStatusMessage(`Failed to create chart: ${error.message || error}`, 'error');
      setIsChartReady(false);
    }
  };

  /**
   * @function handleFileUpload
   * @description Handles the file upload event, parses the file content based on its extension,
   * and updates the application state with the processed data. It also attempts to
   * auto-select appropriate columns for charting.
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
   */
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (e.g., 10MB limit)
    const MAX_FILE_SIZE_MB = 10;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      addStatusMessage(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`, 'error');
      return;
    }

    setIsLoading(true);
    addStatusMessage(`Processing "${file.name}"...`, 'info');

    try {
      const text = await file.text();
      let headers: string[];
      let processedData: Record<string, any>[];

      const fileExtension = file.name.toLowerCase().split('.').pop();

      switch (fileExtension) {
        case 'csv':
        case 'tsv':
          const csvResult = await FileProcessor.processCSV(text);
          headers = csvResult.headers;
          processedData = csvResult.data;
          break;

        case 'json':
        case 'jsonl':
          const jsonResult = await FileProcessor.processJSON(text);
          headers = jsonResult.headers;
          processedData = jsonResult.data;
          break;

        default:
          throw new Error(`Unsupported file format: ".${fileExtension}". Supported formats are CSV, JSON, and TSV.`);
      }

      if (!processedData || processedData.length === 0) {
        throw new Error('No valid data records found in the file after processing.');
      }

      // Create a unique ID for the uploaded file
      const uploadedFile: UploadedFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type || `application/${fileExtension}`,
        size: file.size,
        uploadDate: new Date(),
        data: processedData,
        columns: headers,
        rowCount: processedData.length,
        preview: processedData.slice(0, 5) // Store first 5 rows for quick preview
      };

      // Add the new file to the list, keeping only the 10 most recent
      setUploadedFiles(prev => [uploadedFile, ...prev.slice(0, 9)]);
      setSelectedFile(uploadedFile);

      // Smart column auto-selection logic
      if (headers.length >= 2) {
        const numerics = headers.filter(col =>
          processedData.some(row => typeof row[col] === 'number')
        );

        // Prioritize first column as label, first numeric as value, and third column as series if available
        const labelCol = headers[0];
        const valueCol = numerics.length > 0 ? numerics[0] : headers[1];
        const seriesCol = headers.length > 2 ? headers[2] : '';

        setSelectedColumns({
          label: labelCol,
          value: valueCol,
          series: seriesCol
        });

        // Auto-generate chart data immediately after file upload and column selection
        const newChartData = processDataForChart(processedData, labelCol, valueCol, seriesCol);
        if (newChartData) {
          setChartData(newChartData);
        }
      } else {
        addStatusMessage('File contains insufficient columns for automatic chart generation. Please select columns manually.', 'warning');
        setSelectedColumns({ label: '', value: '', series: '' });
        setChartData(null);
      }

      addStatusMessage(
        `Successfully loaded ${processedData.length} records with ${headers.length} columns from "${file.name}".`,
        'success'
      );
    } catch (error: any) {
      console.error('File processing error:', error);
      addStatusMessage(
        error instanceof Error ? error.message : 'An unknown error occurred during file processing.',
        'error'
      );
      setSelectedFile(null);
      setChartData(null);
      setSelectedColumns({ label: '', value: '', series: '' });
    } finally {
      setIsLoading(false);
      // Reset file input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [processDataForChart, addStatusMessage]);

  /**
   * @function updateChart
   * @description Triggers a re-generation of chart data and re-renders the chart
   * based on the currently selected file and column configurations.
   */
  const updateChart = useCallback((): void => {
    if (!selectedFile) {
      addStatusMessage('No file selected to update chart.', 'warning');
      return;
    }
    if (!selectedColumns.label || !selectedColumns.value) {
      addStatusMessage('Please select both a label column and a value column to generate the chart.', 'warning');
      return;
    }

    const newChartData = processDataForChart(
      selectedFile.data,
      selectedColumns.label,
      selectedColumns.value,
      selectedColumns.series || undefined
    );

    if (newChartData) {
      setChartData(newChartData);
    } else {
      addStatusMessage('Failed to generate chart data with the selected columns. Please check your data and selections.', 'error');
    }
  }, [selectedFile, selectedColumns, processDataForChart, addStatusMessage]);

  /**
   * @effect Re-creates the chart whenever `chartData` changes.
   * This ensures the chart reflects the latest processed data.
   */
  useEffect(() => {
    if (chartData && canvasRef.current) {
      createChart(chartData);
    }
  }, [chartData]); // Dependency on chartData ensures data changes trigger chart update

  /**
   * @effect Re-creates the chart when `chartConfig` or `colorPalette` changes.
   * This allows dynamic updates to chart appearance without re-processing data.
   */
  useEffect(() => {
    // Only recreate if there's existing chart data and an instance is ready
    if (chartData && chartInstance && isChartReady) {
      createChart(chartData);
    }
  }, [chartConfig, colorPalette]); // Dependencies on config and palette ensure appearance changes trigger update

  /**
   * @function downloadChart
   * @description Downloads the current chart as an image file (PNG or JPG).
   * @param {'png' | 'jpg'} format - The desired image format for download.
   */
  const downloadChart = useCallback((format: 'png' | 'jpg' = 'png'): void => {
    if (!chartInstance || !canvasRef.current || !isChartReady) {
      addStatusMessage('Chart is not ready for download. Please ensure a chart is displayed.', 'warning');
      return;
    }

    try {
      const canvas = chartInstance.canvas || canvasRef.current;
      // Use toBase64Image for better quality and format control
      const dataURL = chartInstance.toBase64Image(`image/${format}`, format === 'jpg' ? 0.9 : 1.0);

      if (!dataURL || dataURL === 'data:,') {
        throw new Error('Failed to generate chart image data URL.');
      }

      const link = document.createElement('a');
      link.download = `chart-${chartConfig.type}-${Date.now()}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addStatusMessage(`Chart successfully downloaded as ${format.toUpperCase()}!`, 'success', 3000);
    } catch (error: any) {
      console.error('Chart download error:', error);
      addStatusMessage(`Failed to download chart: ${error.message || error}`, 'error');
    }
  }, [chartInstance, chartConfig.type, isChartReady, addStatusMessage]);

  /**
   * @function deleteFile
   * @description Removes an uploaded file from the list and resets the selected file/chart if it was active.
   * @param {string} fileId - The ID of the file to delete.
   */
  const deleteFile = useCallback((fileId: string): void => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
      setChartData(null);
      setSelectedColumns({ label: '', value: '', series: '' });
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }
      addStatusMessage('Active file successfully removed.', 'info', 2000);
    } else {
      addStatusMessage('File successfully removed from history.', 'info', 2000);
    }
  }, [selectedFile, chartInstance, addStatusMessage]);

  /**
   * @function selectFile
   * @description Sets an uploaded file as the currently active file for charting.
   * Resets column selections and chart data to allow fresh configuration.
   * @param {UploadedFile} file - The file to select.
   */
  const selectFile = useCallback((file: UploadedFile): void => {
    setSelectedFile(file);
    // Reset selections and chart data when switching files
    setSelectedColumns({ label: '', value: '', series: '' });
    setChartData(null);
    setIsChartReady(false); // Chart will be re-generated

    if (chartInstance) {
      chartInstance.destroy();
      setChartInstance(null);
    }
    addStatusMessage(`"${file.name}" selected. Please configure columns to generate chart.`, 'info', 3000);
  }, [chartInstance, addStatusMessage]);

  /**
   * @function handleColumnChange
   * @description Updates the selected column for labels, values, or series.
   * @param {keyof typeof selectedColumns} type - The type of column being changed ('label', 'value', 'series').
   * @param {string} value - The new column name.
   */
  const handleColumnChange = useCallback((
    type: keyof typeof selectedColumns,
    value: string
  ): void => {
    setSelectedColumns(prev => ({ ...prev, [type]: value }));
  }, []);

  /**
   * @function handleChartConfigChange
   * @description Updates a specific chart configuration property.
   * @param {keyof ChartConfig} key - The key of the configuration property to update.
   * @param {any} value - The new value for the property.
   */
  const handleChartConfigChange = useCallback((
    key: keyof ChartConfig,
    value: any
  ): void => {
    setChartConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * @component StatusMessage
   * @description A presentational component for displaying individual status messages.
   * @param {object} props - Component props.
   * @param {StatusMessage} props.message - The status message object to display.
   */
  const StatusMessage: React.FC<{ message: StatusMessage }> = ({ message }) => {
    const icons = {
      success: CheckCircle,
      error: AlertCircle,
      warning: AlertCircle,
      info: Info
    };

    const Icon = icons[message.type];

    return (
      <div className={`
        flex items-center gap-3 p-4 rounded-lg border transition-all duration-300
        ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          message.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'}
      `}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="flex-1 font-medium">{message.message}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeStatusMessage(message.id)}
          className="h-6 w-6 p-0 hover:bg-white/50"
          aria-label="Dismiss message"
        >
          ×
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 font-sans text-slate-800">
      {/* Enhanced Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors group"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Advanced Chart Builder
                  </h1>
                  <p className="text-sm text-slate-500">Transform your data into beautiful visualizations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Status Messages Display */}
        {statusMessages.length > 0 && (
          <div className="mb-6 space-y-2" aria-live="polite" aria-atomic="true">
            {/* Display up to the last 3 messages */}
            {statusMessages.slice(-3).map(message => (
              <StatusMessage key={message.id} message={message} />
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Panel: File Upload, Configuration, History */}
          <div className="lg:col-span-4 space-y-6">
            {/* File Upload Section */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5 text-blue-600" />
                  Data Upload
                </CardTitle>
                <CardDescription>
                  Supports CSV, JSON, and TSV files up to 10MB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-100'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const fakeEvent = { target: { files } } as React.ChangeEvent<HTMLInputElement>;
                      handleFileUpload(fakeEvent);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload data file"
                >
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700 mb-2">
                        Drop files here or click to browse
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        CSV, JSON, TSV files • Max 10MB • Drag & drop supported
                      </p>
                      <Button
                        disabled={isLoading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.tsv,.jsonl"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-hidden="true" // Hide from screen readers as button handles interaction
                  />
                </div>
              </CardContent>
            </Card>

            {/* File Information & Column Selection */}
            {selectedFile && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-green-600" />
                    Chart Configuration
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="font-medium text-slate-700">{selectedFile.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>{selectedFile.rowCount.toLocaleString()} rows • {selectedFile.columns.length} columns</div>
                      <div>{(selectedFile.size / 1024).toFixed(1)} KB • Uploaded {selectedFile.uploadDate.toLocaleDateString()}</div>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Data Statistics */}
                  {fileStats && (
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm text-slate-700">Data Overview</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Numeric columns:</span>
                          <span className="ml-2 font-medium text-blue-600">{fileStats.numerics.length}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Text columns:</span>
                          <span className="ml-2 font-medium text-green-600">{fileStats.categoricals.length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Column Selection */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="label-column-select" className="block text-sm font-semibold mb-2 text-slate-700">
                        Label Column (X-axis) <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="label-column-select"
                        value={selectedColumns.label}
                        onChange={(e) => handleColumnChange('label', e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        aria-required="true"
                      >
                        <option value="">Select label column...</option>
                        {selectedFile.columns.map(column => (
                          <option key={column} value={column}>
                            {column} {fileStats?.numerics.includes(column) ? '(numeric)' : '(text)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="value-column-select" className="block text-sm font-semibold mb-2 text-slate-700">
                        Value Column (Y-axis) <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="value-column-select"
                        value={selectedColumns.value}
                        onChange={(e) => handleColumnChange('value', e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        aria-required="true"
                      >
                        <option value="">Select value column...</option>
                        {selectedFile.columns.map(column => (
                          <option key={column} value={column}>
                            {column} {fileStats?.numerics.includes(column) ? '(numeric)' : '(text)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="series-column-select" className="block text-sm font-semibold mb-2 text-slate-700">
                        Series Column (Optional)
                        <span className="text-xs font-normal text-slate-500 ml-2">For grouped charts</span>
                      </label>
                      <select
                        id="series-column-select"
                        value={selectedColumns.series}
                        onChange={(e) => handleColumnChange('series', e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">No series grouping</option>
                        {selectedFile.columns
                          .filter(col => col !== selectedColumns.label && col !== selectedColumns.value)
                          .map(column => (
                            <option key={column} value={column}>
                              {column} {fileStats?.numerics.includes(column) ? '(numeric)' : '(text)'}
                            </option>
                          ))}
                      </select>
                    </div>

                    <Button
                      onClick={updateChart}
                      disabled={!selectedColumns.label || !selectedColumns.value}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Chart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart Type Selection */}
            {chartData && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Chart Types
                  </CardTitle>
                  <CardDescription>
                    Choose the best visualization for your data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    {CHART_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = chartConfig.type === type.type;

                      return (
                        <button
                          key={type.type}
                          onClick={() => handleChartConfigChange('type', type.type)}
                          className={`
                            p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md
                            ${isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                            }
                          `}
                          aria-pressed={isSelected}
                          aria-label={`Select ${type.name}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500' : 'bg-slate-100'}`}>
                              <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                {type.name}
                              </h4>
                              <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                                {type.description}
                              </p>
                              <p className={`text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                                Best for: {type.bestFor}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart Customization Options */}
            {chartData && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5 text-indigo-600" />
                    Customization
                  </CardTitle>
                  <CardDescription>Adjust visual properties of your chart.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Color Palette Selection */}
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-slate-700">Color Palette</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(COLOR_PALETTES).map(([name, colors]) => (
                        <button
                          key={name}
                          onClick={() => setColorPalette(name as keyof typeof COLOR_PALETTES)}
                          className={`
                            p-2 rounded-lg border-2 transition-all
                            ${colorPalette === name ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}
                          `}
                          aria-pressed={colorPalette === name}
                          aria-label={`Select ${name} color palette`}
                        >
                          <div className="flex space-x-1 mb-1">
                            {colors.slice(0, 3).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium capitalize">{name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart Display Options (Legend, Grid) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="toggle-legend" className="text-sm font-medium text-slate-700 cursor-pointer">Show Legend</label>
                      <button
                        id="toggle-legend"
                        role="switch"
                        aria-checked={chartConfig.showLegend}
                        onClick={() => handleChartConfigChange('showLegend', !chartConfig.showLegend)}
                        className={`
                          w-12 h-6 rounded-full transition-colors relative
                          ${chartConfig.showLegend ? 'bg-blue-500' : 'bg-slate-300'}
                        `}
                      >
                        <span className={`
                          w-5 h-5 bg-white rounded-full shadow-md transition-transform absolute top-0.5
                          ${chartConfig.showLegend ? 'translate-x-6' : 'translate-x-0.5'}
                        `} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label htmlFor="toggle-grid" className="text-sm font-medium text-slate-700 cursor-pointer">Show Grid</label>
                      <button
                        id="toggle-grid"
                        role="switch"
                        aria-checked={chartConfig.showGrid}
                        onClick={() => handleChartConfigChange('showGrid', !chartConfig.showGrid)}
                        className={`
                          w-12 h-6 rounded-full transition-colors relative
                          ${chartConfig.showGrid ? 'bg-blue-500' : 'bg-slate-300'}
                        `}
                      >
                        <span className={`
                          w-5 h-5 bg-white rounded-full shadow-md transition-transform absolute top-0.5
                          ${chartConfig.showGrid ? 'translate-x-6' : 'translate-x-0.5'}
                        `} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Uploaded Files History */}
            {uploadedFiles.length > 0 && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-slate-600" />
                    Recent Files
                  </CardTitle>
                  <CardDescription>
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded recently.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {uploadedFiles.slice(0, 5).map((file) => (
                    <div
                      key={file.id}
                      className={`
                        p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 group hover:shadow-md
                        ${selectedFile?.id === file.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                        }
                      `}
                      onClick={() => selectFile(file)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedFile?.id === file.id}
                      aria-label={`Select file ${file.name}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className={`h-4 w-4 flex-shrink-0 ${
                              selectedFile?.id === file.id ? 'text-blue-600' : 'text-slate-500'
                            }`} />
                            <p className={`font-medium truncate ${
                              selectedFile?.id === file.id ? 'text-blue-900' : 'text-slate-900'
                            }`}>
                              {file.name}
                            </p>
                          </div>
                          <div className={`text-xs space-y-0.5 ${
                            selectedFile?.id === file.id ? 'text-blue-700' : 'text-slate-500'
                          }`}>
                            <div>{file.rowCount.toLocaleString()} rows • {file.columns.length} cols</div>
                            <div>{(file.size / 1024).toFixed(1)} KB • {file.uploadDate.toLocaleDateString()}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent selecting file when deleting
                            deleteFile(file.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete file ${file.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel: Chart Display Area */}
          <div className="lg:col-span-8">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Chart Preview</CardTitle>
                      <CardDescription>
                        {chartData ? `${chartData.datasets[0]?.label || 'Data'} • ${chartData.labels.length} data points` : 'No data selected for charting.'}
                      </CardDescription>
                    </div>
                  </div>
                  {chartInstance && isChartReady && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadChart('png')}
                        className="hover:bg-blue-50 hover:border-blue-300"
                        aria-label="Download chart as PNG"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PNG
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadChart('jpg')}
                        className="hover:bg-green-50 hover:border-green-300"
                        aria-label="Download chart as JPG"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        JPG
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {chartData ? (
                  <div className="relative">
                    <div className="h-[600px] w-full bg-white rounded-lg p-4 shadow-inner">
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full"
                        style={{ filter: isChartReady ? 'none' : 'blur(2px)' }}
                        role="img"
                        aria-label="Generated data chart"
                      />
                      {!isChartReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                          <div className="text-center space-y-2">
                            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                            <p className="text-sm font-medium text-slate-600">Generating chart...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chart Information Display */}
                    {isChartReady && selectedFile && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Chart Type:</span>
                            <span className="ml-2 font-medium text-slate-900 capitalize">{chartConfig.type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Data Points:</span>
                            <span className="ml-2 font-medium text-blue-600">{chartData.labels.length}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Series:</span>
                            <span className="ml-2 font-medium text-green-600">{chartData.datasets.length}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Source File:</span>
                            <span className="ml-2 font-medium text-purple-600 truncate">{selectedFile.name}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
                    <div className="space-y-6 max-w-md">
                      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                        <BarChart3 className="h-12 w-12 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">Ready to Create Charts</h3>
                        <p className="text-slate-500 mb-4">
                          Upload your data file and configure the chart settings to generate beautiful visualizations.
                        </p>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>✓ Support for CSV, JSON, TSV formats</p>
                          <p>✓ Multiple chart types available</p>
                          <p>✓ Interactive and downloadable charts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

