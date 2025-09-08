import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Type declaration for gif.js
declare global {
  interface Window {
    GIF: any;
  }
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }>;
}

interface ExcelData {
  [key: string]: any;
}

export default function AnimateChart() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartInstance, setChartInstance] = useState<any>(null);
  const [currentChartType, setCurrentChartType] = useState<string>('bar');
  const [excelWorkbook, setExcelWorkbook] = useState<any>(null);
  const [currentSheetData, setCurrentSheetData] = useState<ExcelData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: string; message: string } | null>(null);
  const [selectedLabelColumn, setSelectedLabelColumn] = useState<string>('');
  const [selectedValueColumn, setSelectedValueColumn] = useState<string>('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [animationDuration, setAnimationDuration] = useState(2);
  const [animationStyle, setAnimationStyle] = useState('easeInOutQuart');
  const [animationDelay, setAnimationDelay] = useState(100);
  const [showExcelControls, setShowExcelControls] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [isExportingGif, setIsExportingGif] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chart types configuration
  const chartTypes = [
    { type: 'bar', icon: 'fas fa-chart-bar', name: 'Bar' },
    { type: 'line', icon: 'fas fa-chart-line', name: 'Line' },
    { type: 'pie', icon: 'fas fa-chart-pie', name: 'Pie' },
    { type: 'doughnut', icon: 'fas fa-dot-circle', name: 'Doughnut' },
    { type: 'radar', icon: 'fas fa-chart-area', name: 'Radar' },
    { type: 'polarArea', icon: 'fas fa-circle', name: 'Polar' },
    { type: 'scatter', icon: 'fas fa-braille', name: 'Scatter' },
    { type: 'bubble', icon: 'fas fa-circle', name: 'Bubble' }
  ];

  // Show status message
  const showStatus = useCallback((message: string, type: string) => {
    setStatusMessage({ message, type });
    if (type === 'success' || type === 'warning') {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  }, []);

  // Generate colors for charts
  const generateColors = useCallback((count: number, alpha: number = 0.7) => {
    const baseColors = [
      '#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#7209b7',
      '#f72585', '#b5179e', '#480ca8', '#560bad', '#b07219',
      '#06d6a0', '#118ab2', '#073b4c', '#ffd166', '#ef476f'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
      const color = baseColors[i % baseColors.length];
      if (alpha === 1) {
        colors.push(color);
      } else {
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        colors.push(`rgba(${r}, ${g}, ${b}, ${alpha})`);
      }
    }
    return colors;
  }, []);

  // CSV parser
  const parseCSV = useCallback((csv: string) => {
    const lines = csv.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    return data;
  }, []);

  const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // Process data for chart
  const processDataForChart = useCallback((data: any[]) => {
    if (!data || data.length === 0) {
      throw new Error('No data to process');
    }

    const labels = [];
    const values = [];
    
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    
    if (columns.length < 2) {
      throw new Error('Data must have at least 2 columns');
    }

    let labelColumn = selectedLabelColumn || columns[0];
    let valueColumn = selectedValueColumn;

    if (!valueColumn) {
      for (const col of columns) {
        if (col !== labelColumn) {
          const testValue = firstRow[col];
          if (!isNaN(parseFloat(testValue)) && isFinite(testValue)) {
            valueColumn = col;
            break;
          }
        }
      }
      if (!valueColumn) {
        valueColumn = columns[1];
      }
    }

    const dataMap = new Map<string, number>();

    // Group data by unique labels and sum values
    data.forEach((row, index) => {
      if (index >= 1000) return;

      const label = row[labelColumn] || `Item ${index + 1}`;
      let value = parseFloat(row[valueColumn]);

      if (isNaN(value)) {
        const numMatch = String(row[valueColumn]).match(/[\d.,-]+/);
        if (numMatch) {
          const numStr = numMatch[0].replace(/,/g, '');
          value = parseFloat(numStr);
        } else {
          value = 1;
        }
      }

      const labelKey = String(label).trim();

      // Aggregate values for same labels
      if (dataMap.has(labelKey)) {
        dataMap.set(labelKey, dataMap.get(labelKey)! + value);
      } else {
        dataMap.set(labelKey, value);
      }
    });

    // Convert map to arrays, limit to reasonable number
    const uniqueEntries = Array.from(dataMap.entries()).slice(0, 30);
    labels.push(...uniqueEntries.map(([label]) => label));
    values.push(...uniqueEntries.map(([, value]) => value));

    return {
      labels: labels,
      datasets: [{
        label: valueColumn || 'Values',
        data: values,
        backgroundColor: generateColors(labels.length, 0.7),
        borderColor: generateColors(labels.length, 1),
        borderWidth: 2
      }]
    };
  }, [selectedLabelColumn, selectedValueColumn, generateColors]);

  // File upload handlers
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFile(file);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    
    setIsLoading(true);
    showStatus(`Processing file: ${file.name}`, 'warning');
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        parseFileData(e.target?.result, file.name);
      } catch (error) {
        console.error('Error reading file:', error);
        showStatus(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        setIsLoading(false);
      }
    };
    
    reader.onerror = function(e) {
      console.error('FileReader error:', e);
      showStatus('Error reading file', 'error');
      setIsLoading(false);
    };
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith('.json')) {
      reader.readAsText(file);
    } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      showStatus('Unsupported file type. Please use CSV, Excel, or JSON files.', 'error');
      setIsLoading(false);
    }
  }, [showStatus]);

  // Parse file data
  const parseFileData = useCallback((content: any, filename: string) => {
    try {
      let data;
      
      if (filename.toLowerCase().endsWith('.csv')) {
        data = parseCSV(content);
        processStandardData(data);
      } else if (filename.toLowerCase().endsWith('.json')) {
        data = JSON.parse(content);
        if (!Array.isArray(data)) {
          const keys = Object.keys(data);
          if (keys.length > 0 && Array.isArray(data[keys[0]])) {
            data = data[keys[0]];
          } else {
            data = [data];
          }
        }
        processStandardData(data);
      } else if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
        processExcelFile(content);
      }
    } catch (error) {
      console.error('Parse error:', error);
      showStatus(`Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsLoading(false);
    }
  }, [parseCSV, showStatus]);

  // Process Excel file
  const processExcelFile = useCallback(async (arrayBuffer: ArrayBuffer) => {
    try {
      // Dynamic import for XLSX
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(arrayBuffer, {type: 'array'});
      const sheetNames = workbook.SheetNames;
      
      setExcelWorkbook(workbook);
      setShowExcelControls(true);
      
      if (sheetNames.length === 1) {
        loadSheetData(workbook, sheetNames[0]);
      }
      
      showStatus(`Excel file loaded! Found ${sheetNames.length} sheet(s). Please select a sheet to continue.`, 'success');
      setIsLoading(false);
      
    } catch (error) {
      console.error('Excel processing error:', error);
      showStatus(`Error processing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsLoading(false);
    }
  }, [showStatus]);

  // Load sheet data
  const loadSheetData = useCallback(async (workbook: any, sheetName: string) => {
    try {
      const XLSX = await import('xlsx');
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet);
      
      if (sheetData.length === 0) {
        showStatus('Selected sheet is empty', 'warning');
        return;
      }
      
      setCurrentSheetData(sheetData);
      const columns = Object.keys(sheetData[0]);
      
      if (columns.length >= 2) {
        setSelectedLabelColumn(columns[0]);
        
        let valueCol = '';
        for (const col of columns) {
          if (col !== columns[0]) {
            const testValue = sheetData[0][col];
            if (!isNaN(parseFloat(testValue)) && isFinite(testValue)) {
              valueCol = col;
              break;
            }
          }
        }
        
        if (!valueCol) {
          valueCol = columns[1];
        }
        
        setSelectedValueColumn(valueCol);
        
        // Process chart data
        const processedData = processSelectedColumns(sheetData, columns[0], valueCol);
        setChartData(processedData);
        enableControls(true);
        createChart(processedData);
      }
      
      showStatus(`Sheet "${sheetName}" loaded with ${sheetData.length} rows and ${columns.length} columns.`, 'success');
      
    } catch (error) {
      console.error('Sheet loading error:', error);
      showStatus(`Error loading sheet: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  }, [showStatus, processDataForChart]);

  // Process selected columns
  const processSelectedColumns = useCallback((data: any[], labelColumn: string, dataColumn: string) => {
    // Check if the data column contains numeric values
    const sampleValues = data.slice(0, 20).map(row => row[dataColumn]);
    const isNumericColumn = sampleValues.some(val => {
      const num = parseFloat(String(val));
      return !isNaN(num) && isFinite(num);
    });

    if (isNumericColumn) {
      // Handle numeric data - group by label column, sum values
      const dataMap = new Map<string, number[]>();

      data.forEach((row, index) => {
        if (index >= 1000) return;

        const label = String(row[labelColumn] || `Item ${index + 1}`).trim();
        let value = parseFloat(String(row[dataColumn]));

        if (isNaN(value)) {
          const numMatch = String(row[dataColumn]).match(/[\d.,-]+/);
          if (numMatch) {
            const numStr = numMatch[0].replace(/,/g, '');
            value = parseFloat(numStr);
          } else {
            value = 0;
          }
        }

        // Group values by label
        if (dataMap.has(label)) {
          dataMap.get(label)!.push(value);
        } else {
          dataMap.set(label, [value]);
        }
      });

      // Calculate sum for each label group
      const aggregatedData = Array.from(dataMap.entries()).map(([label, values]) => {
        const sum = values.reduce((total, val) => total + val, 0);
        return [label, sum] as [string, number];
      });

      // Sort by value (descending) and limit results
      const sortedEntries = aggregatedData
        .sort(([,a], [,b]) => b - a)
        .slice(0, 30);

      const labels = sortedEntries.map(([label]) => label);
      const values = sortedEntries.map(([, value]) => value);

      return {
        labels: labels,
        datasets: [{
          label: `Sum of ${dataColumn} by ${labelColumn}`,
          data: values,
          backgroundColor: generateColors(labels.length, 0.7),
          borderColor: generateColors(labels.length, 1),
          borderWidth: 2
        }]
      };
    } else {
      // Handle categorical data - group by label column, count data occurrences
      const labelValueMap = new Map<string, Map<string, number>>();

      data.forEach((row, index) => {
        if (index >= 1000) return;

        const label = String(row[labelColumn] || `Item ${index + 1}`).trim();
        const dataValue = String(row[dataColumn] || 'Unknown').trim();

        if (!labelValueMap.has(label)) {
          labelValueMap.set(label, new Map<string, number>());
        }

        const valueMap = labelValueMap.get(label)!;
        if (valueMap.has(dataValue)) {
          valueMap.set(dataValue, valueMap.get(dataValue)! + 1);
        } else {
          valueMap.set(dataValue, 1);
        }
      });

      // For text data, show count of data values per label
      const labelCounts = Array.from(labelValueMap.entries()).map(([label, valueMap]) => {
        const totalCount = Array.from(valueMap.values()).reduce((sum, count) => sum + count, 0);
        return [label, totalCount] as [string, number];
      });

      // Sort by count (descending) and limit results
      const sortedEntries = labelCounts
        .sort(([,a], [,b]) => b - a)
        .slice(0, 30);

      const labels = sortedEntries.map(([label]) => label);
      const values = sortedEntries.map(([, count]) => count);

      return {
        labels: labels,
        datasets: [{
          label: `Count of ${dataColumn} by ${labelColumn}`,
          data: values,
          backgroundColor: generateColors(labels.length, 0.7),
          borderColor: generateColors(labels.length, 1),
          borderWidth: 2
        }]
      };
    }
  }, [generateColors]);

  // Process standard data
  const processStandardData = useCallback((data: any[]) => {
    if (data && data.length > 0) {
      // Store the data for column selection
      setCurrentSheetData(data);

      // Auto-select first available columns
      const columns = Object.keys(data[0]);
      if (columns.length >= 2) {
        const labelCol = columns[0];
        let dataCol = '';

        // Try to find a good data column (prefer numeric, but any column works)
        for (const col of columns) {
          if (col !== labelCol) {
            dataCol = col;
            break;
          }
        }

        if (!dataCol) {
          dataCol = columns[1];
        }

        setSelectedLabelColumn(labelCol);
        setSelectedValueColumn(dataCol);

        // Process chart data with selected columns
        const processedData = processSelectedColumns(data, labelCol, dataCol);
        setChartData(processedData);
        createChart(processedData);
      } else {
        const processedData = processDataForChart(data);
        setChartData(processedData);
        createChart(processedData);
      }

      showStatus(`File uploaded successfully! ${data.length} records loaded.`, 'success');
      enableControls(true);
    } else {
      throw new Error('No valid data found in file');
    }
    setIsLoading(false);
  }, [processDataForChart, processSelectedColumns, showStatus]);

  // Create chart
  const createChart = useCallback(async (data?: ChartData) => {
    const dataToUse = data || chartData;
    if (!dataToUse || !canvasRef.current) return;

    try {
      // Dynamic import for Chart.js
      const { default: Chart } = await import('chart.js/auto');

      // Properly destroy existing chart instance
      if (chartInstance) {
        chartInstance.destroy();
        setChartInstance(null);
      }

      // Also check if Chart.js has any existing chart on this canvas
      const existingChart = Chart.getChart(canvasRef.current);
      if (existingChart) {
        existingChart.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const config = getChartConfig(dataToUse);
      const newInstance = new Chart(ctx, config);
      setChartInstance(newInstance);
    } catch (error) {
      console.error('Error creating chart:', error);
      showStatus('Error creating chart', 'error');
    }
  }, [chartData, chartInstance, currentChartType, showStatus]);

  // Get chart configuration
  const getChartConfig = useCallback((data: ChartData) => {
    const baseConfig = {
      type: currentChartType,
      data: JSON.parse(JSON.stringify(data)),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        plugins: {
          title: {
            display: true,
            text: `Animated ${data.datasets[0]?.label || 'Data'} Chart`,
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 30
            },
            color: '#2b2d42'
          },
          legend: {
            display: true,
            position: ['pie', 'doughnut', 'radar', 'polarArea'].includes(currentChartType) ? 'right' : 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#2b2d42'
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(43, 45, 66, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y ?? context.parsed;
                return `${label}: ${typeof value === 'number' ? value.toLocaleString() : value}`;
              }
            }
          }
        }
      }
    };

    switch (currentChartType) {
      case 'bar':
      case 'line':
        baseConfig.options.scales = {
          x: {
            display: true,
            title: {
              display: true,
              text: selectedLabelColumn || 'Categories',
              font: {
                size: 14,
                weight: 'bold'
              },
              padding: {
                top: 10
              },
              color: '#2b2d42'
            },
            ticks: {
              font: {
                size: 11,
                weight: '500'
              },
              color: '#64748b',
              maxRotation: 45,
              minRotation: 0
            },
            grid: {
              display: true,
              color: 'rgba(100, 116, 139, 0.1)',
              lineWidth: 1
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            title: {
              display: true,
              text: selectedValueColumn || 'Values',
              font: {
                size: 14,
                weight: 'bold'
              },
              padding: {
                bottom: 10
              },
              color: '#2b2d42'
            },
            ticks: {
              font: {
                size: 11,
                weight: '500'
              },
              color: '#64748b',
              callback: function(value) {
                return typeof value === 'number' ? value.toLocaleString() : value;
              }
            },
            grid: {
              display: true,
              color: 'rgba(100, 116, 139, 0.1)',
              lineWidth: 1
            }
          }
        };
        break;

      case 'scatter':
      case 'bubble':
        baseConfig.data.datasets[0].data = data.datasets[0].data.map((value, index) => ({
          x: index,
          y: value,
          r: currentChartType === 'bubble' ? Math.max(5, value / 10) : undefined
        }));
        baseConfig.options.scales = {
          x: {
            type: 'linear',
            position: 'bottom',
            display: true,
            title: {
              display: true,
              text: 'Index',
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#2b2d42'
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#64748b'
            },
            grid: {
              color: 'rgba(100, 116, 139, 0.1)'
            }
          },
          y: {
            beginAtZero: true,
            display: true,
            title: {
              display: true,
              text: selectedValueColumn || 'Values',
              font: {
                size: 14,
                weight: 'bold'
              },
              color: '#2b2d42'
            },
            ticks: {
              font: {
                size: 11
              },
              color: '#64748b',
              callback: function(value) {
                return typeof value === 'number' ? value.toLocaleString() : value;
              }
            },
            grid: {
              color: 'rgba(100, 116, 139, 0.1)'
            }
          }
        };
        break;

      case 'radar':
        baseConfig.options.scales = {
          r: {
            beginAtZero: true,
            title: {
              display: true,
              text: selectedValueColumn || 'Values',
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#2b2d42'
            },
            ticks: {
              font: {
                size: 10
              },
              color: '#64748b',
              callback: function(value) {
                return typeof value === 'number' ? value.toLocaleString() : value;
              }
            },
            grid: {
              color: 'rgba(100, 116, 139, 0.1)'
            },
            angleLines: {
              color: 'rgba(100, 116, 139, 0.2)'
            },
            pointLabels: {
              font: {
                size: 11,
                weight: 'bold'
              },
              color: '#2b2d42'
            }
          }
        };
        break;

      case 'pie':
      case 'doughnut':
        baseConfig.options.plugins.tooltip.callbacks = {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        };
        break;

      case 'polarArea':
        baseConfig.options.scales = {
          r: {
            beginAtZero: true,
            title: {
              display: true,
              text: selectedValueColumn || 'Values',
              font: {
                size: 12,
                weight: 'bold'
              },
              color: '#2b2d42'
            },
            ticks: {
              font: {
                size: 10
              },
              color: '#64748b'
            },
            grid: {
              color: 'rgba(100, 116, 139, 0.1)'
            }
          }
        };
        break;
    }

    return baseConfig;
  }, [currentChartType, selectedLabelColumn, selectedValueColumn]);

  // Enable/disable controls
  const enableControls = useCallback((enabled: boolean) => {
    // This would be handled by state in React
  }, []);

  // Chart type selection
  const selectChartType = useCallback((type: string) => {
    setCurrentChartType(type);
    if (chartData) {
      createChart();
    }
  }, [chartData, createChart]);

  // Generate sample data
  const generateSampleData = useCallback(() => {
    const sampleData = [
      { Product: 'Laptop', Sales: 1500, Revenue: 150000 },
      { Product: 'Phone', Sales: 2300, Revenue: 230000 },
      { Product: 'Tablet', Sales: 800, Revenue: 80000 },
      { Product: 'Watch', Sales: 1200, Revenue: 120000 },
      { Product: 'Headphones', Sales: 900, Revenue: 45000 },
      { Product: 'Camera', Sales: 600, Revenue: 180000 }
    ];

    setShowExcelControls(false);
    const processedData = processDataForChart(sampleData);
    setChartData(processedData);
    showStatus('Sample data loaded! Click Play Animation to see it in action.', 'success');
    enableControls(true);
    createChart(processedData);
  }, [processDataForChart, showStatus, enableControls, createChart]);

  // Animation functions
  const playAnimation = useCallback(() => {
    if (!chartInstance || !chartData) {
      console.error('No chart instance or data available');
      return;
    }

    console.log('Starting animation with settings:', {
      duration: animationDuration,
      style: animationStyle,
      delay: animationDelay,
      type: currentChartType
    });

    // Reset animation first
    resetAnimation();

    // Start animation after a brief delay
    setTimeout(() => {
      switch (currentChartType) {
        case 'bar':
          animateBarChart();
          break;
        case 'line':
          animateLineChart();
          break;
        case 'pie':
        case 'doughnut':
          animatePieChart();
          break;
        case 'radar':
          animateRadarChart();
          break;
        case 'polarArea':
          animatePolarAreaChart();
          break;
        case 'scatter':
        case 'bubble':
          animateScatterChart();
          break;
        default:
          animateBarChart();
      }
    }, 200);
  }, [chartInstance, chartData, animationDuration, animationStyle, animationDelay, currentChartType]);

  // Easing helper function - defined first
  const easeOutBounce = useCallback((t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }, []);

  // Easing functions - defined second
  const applyEasing = useCallback((t: number, easing: string): number => {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeInQuart':
        return t * t * t * t;
      case 'easeOutQuart':
        return 1 - Math.pow(1 - t, 4);
      case 'easeInOutQuart':
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
      case 'easeInOutBounce':
        return t < 0.5
          ? (1 - easeOutBounce(1 - 2 * t)) / 2
          : (1 + easeOutBounce(2 * t - 1)) / 2;
      case 'easeInOutElastic':
        const c5 = (2 * Math.PI) / 4.5;
        return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
      default:
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }
  }, [easeOutBounce]);

  // Helper function to animate individual values with easing - defined third
  const animateValue = useCallback((start: number, end: number, duration: number, callback: (value: number) => void, easing: string = 'easeInOutQuart') => {
    const startTime = performance.now();
    const change = end - start;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = applyEasing(progress, easing);
      const current = start + (change * easedProgress);

      callback(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [applyEasing]);

  const resetAnimation = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const config = getChartConfig(chartData);
    chartInstance.data = config.data;
    chartInstance.update('none');
  }, [chartInstance, chartData, getChartConfig]);

  // Bar chart animation - bars grow from bottom
  const animateBarChart = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const originalData = [...chartData.datasets[0].data];
    const duration = animationDuration * 1000;

    // Start with zero values
    chartInstance.data.datasets[0].data = new Array(originalData.length).fill(0);
    chartInstance.update('none');

    // Animate each bar with delay
    originalData.forEach((value, index) => {
      setTimeout(() => {
        animateValue(0, value, duration / Math.max(originalData.length, 4), (current) => {
          chartInstance.data.datasets[0].data[index] = current;
          chartInstance.update('none');
        }, animationStyle);
      }, index * animationDelay);
    });
  }, [chartInstance, chartData, animationDuration, animationDelay, animationStyle, animateValue]);

  // Line chart animation - line draws progressively
  const animateLineChart = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const originalData = [...chartData.datasets[0].data];
    const originalLabels = [...chartData.labels];

    // Start with empty data
    chartInstance.data.datasets[0].data = [];
    chartInstance.data.labels = [];
    chartInstance.update('none');

    // Add points progressively
    originalData.forEach((value, index) => {
      setTimeout(() => {
        chartInstance.data.labels.push(originalLabels[index]);
        chartInstance.data.datasets[0].data.push(value);
        chartInstance.update({
          duration: 300,
          easing: animationStyle as any
        });
      }, index * animationDelay);
    });
  }, [chartInstance, chartData, animationDelay, animationStyle]);

  // Pie chart animation - segments appear progressively
  const animatePieChart = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const originalData = [...chartData.datasets[0].data];
    const duration = animationDuration * 1000;

    // Start with zero values
    chartInstance.data.datasets[0].data = new Array(originalData.length).fill(0);
    chartInstance.update('none');

    // Animate each segment
    originalData.forEach((value, index) => {
      setTimeout(() => {
        animateValue(0, value, Math.max(500, duration / originalData.length), (current) => {
          chartInstance.data.datasets[0].data[index] = current;
          chartInstance.update('none');
        }, animationStyle);
      }, index * animationDelay);
    });
  }, [chartInstance, chartData, animationDuration, animationDelay, animationStyle]);

  // Radar chart animation - values grow from center
  const animateRadarChart = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const originalData = [...chartData.datasets[0].data];
    const duration = animationDuration * 1000;

    // Start with zero values
    chartInstance.data.datasets[0].data = new Array(originalData.length).fill(0);
    chartInstance.update('none');

    // Animate all values simultaneously
    const totalDuration = duration;
    originalData.forEach((value, index) => {
      animateValue(0, value, totalDuration, (current) => {
        chartInstance.data.datasets[0].data[index] = current;
        chartInstance.update('none');
      }, animationStyle);
    });
  }, [chartInstance, chartData, animationDuration, animationStyle]);

  // Polar area chart animation
  const animatePolarAreaChart = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const originalData = [...chartData.datasets[0].data];
    const duration = animationDuration * 1000;

    // Start with zero values
    chartInstance.data.datasets[0].data = new Array(originalData.length).fill(0);
    chartInstance.update('none');

    // Animate each segment with delay
    originalData.forEach((value, index) => {
      setTimeout(() => {
        animateValue(0, value, duration / Math.max(originalData.length, 3), (current) => {
          chartInstance.data.datasets[0].data[index] = current;
          chartInstance.update('none');
        }, animationStyle);
      }, index * animationDelay);
    });
  }, [chartInstance, chartData, animationDuration, animationDelay, animationStyle]);

  // Scatter/Bubble chart animation - points appear progressively
  const animateScatterChart = useCallback(() => {
    if (!chartInstance || !chartData) return;

    const originalData = [...chartData.datasets[0].data];

    // Start with empty data
    chartInstance.data.datasets[0].data = [];
    chartInstance.update('none');

    // Add points progressively
    originalData.forEach((point, index) => {
      setTimeout(() => {
        chartInstance.data.datasets[0].data.push(point);
        chartInstance.update({
          duration: 400,
          easing: animationStyle as any
        });
      }, index * animationDelay);
    });
  }, [chartInstance, chartData, animationDelay, animationStyle]);


  // Download chart
  const downloadChart = useCallback(() => {
    if (!chartInstance) return;

    const link = document.createElement('a');
    link.download = `animated-chart-${currentChartType}.png`;
    link.href = chartInstance.toBase64Image();
    link.click();
  }, [chartInstance, currentChartType]);

  // Export GIF functionality
  const exportGif = useCallback(async () => {
    if (!chartInstance || !chartData || isExportingGif) return;

    setIsExportingGif(true);
    setExportProgress(0);
    showStatus('Preparing animated export...', 'warning');

    try {
      const originalData = [...chartData.datasets[0].data];
      const frames = 6; // Minimal frames for better performance
      const totalDuration = animationDuration * 1000;
      const frameDelay = Math.max(500, totalDuration / frames);

      showStatus(`Capturing ${frames} animation frames...`, 'warning');

      // Create frame images as data URLs
      const frameImages = [];
      const maxWidth = Math.min(chartInstance.canvas.width, 600);
      const maxHeight = Math.min(chartInstance.canvas.height, 450);

      for (let frame = 0; frame < frames; frame++) {
        const progress = frame / (frames - 1);
        const easedProgress = applyEasing(progress, animationStyle);

        // Update chart data
        const frameData = originalData.map(value => value * easedProgress);
        chartInstance.data.datasets[0].data = frameData;
        chartInstance.update('none');

        // Wait for chart to render
        await new Promise(resolve => setTimeout(resolve, 300));

        // Create frame canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = maxWidth;
        tempCanvas.height = maxHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, maxWidth, maxHeight);

        // Draw chart with scaling
        const scaleX = maxWidth / chartInstance.canvas.width;
        const scaleY = maxHeight / chartInstance.canvas.height;
        tempCtx.scale(scaleX, scaleY);
        tempCtx.drawImage(chartInstance.canvas, 0, 0);

        // Convert to data URL
        const dataURL = tempCanvas.toDataURL('image/png', 0.8);
        frameImages.push(dataURL);

        setExportProgress(Math.round((frame / frames) * 60));
        console.log(`Frame ${frame + 1}/${frames} captured`);
      }

      setExportProgress(70);
      showStatus('Creating animation file...', 'warning');

      // Since gif.js is unreliable, create an HTML page with CSS animation instead
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Animated Chart - ${currentChartType}</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            text-align: center;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .chart-animation {
            width: ${maxWidth}px;
            height: ${maxHeight}px;
            animation: chart-frames ${animationDuration}s infinite;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        @keyframes chart-frames {
            ${frameImages.map((img, i) =>
              `${Math.round((i / (frames - 1)) * 100)}% { background-image: url("${img}"); }`
            ).join('\n            ')}
        }
        h1 { color: #333; margin-bottom: 20px; }
        p { color: #666; margin-top: 20px; }
        .download-note {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
            border-left: 4px solid #2196f3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Animated ${currentChartType.charAt(0).toUpperCase() + currentChartType.slice(1)} Chart</h1>
        <div class="chart-animation"></div>
        <p>Animation Duration: ${animationDuration}s | Frames: ${frames}</p>
        <div class="download-note">
            <strong>Note:</strong> This HTML file contains your animated chart.<br>
            Open it in any browser to view the animation, or use browser developer tools<br>
            to extract individual frames if needed.
        </div>
    </div>
</body>
</html>`;

      setExportProgress(90);

      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `animated-chart-${currentChartType}-${Date.now()}.html`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setIsExportingGif(false);
      setExportProgress(0);
      showStatus('Animated chart exported as HTML file!', 'success');

      console.log('Animation export completed successfully');

    } catch (error) {
      console.error('Animation export error:', error);

      let errorMessage = 'Failed to export animation. ';
      if (error.message?.includes('canvas') || error.message?.includes('context')) {
        errorMessage += 'Chart rendering failed. Try a simpler chart.';
      } else {
        errorMessage += 'Please try PNG export instead.';
      }

      showStatus(errorMessage, 'error');
      setIsExportingGif(false);
      setExportProgress(0);
    } finally {
      // Restore original chart state
      if (chartInstance && chartData) {
        try {
          chartInstance.data.datasets[0].data = [...chartData.datasets[0].data];
          chartInstance.update('none');
        } catch (restoreError) {
          console.error('Error restoring chart state:', restoreError);
        }
      }
    }
  }, [chartInstance, chartData, isExportingGif, animationDuration, animationStyle, currentChartType, showStatus, applyEasing]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // Update duration and delay values
  const updateDurationValue = useCallback((value: string) => {
    setAnimationDuration(parseFloat(value));
  }, []);

  const updateDelayValue = useCallback((value: string) => {
    setAnimationDelay(parseInt(value));
  }, []);

  // Effect to create chart when data changes
  useEffect(() => {
    if (chartData) {
      createChart();
    }
  }, [chartData, currentChartType]);

  // Effect to update chart when columns change
  useEffect(() => {
    if (currentSheetData && selectedLabelColumn && selectedValueColumn) {
      console.log('Columns changed, updating chart:', selectedLabelColumn, selectedValueColumn);
      try {
        const processedData = processSelectedColumns(currentSheetData, selectedLabelColumn, selectedValueColumn);
        console.log('Auto-updating chart with new columns');
        setChartData(processedData);
      } catch (error) {
        console.error('Error auto-updating chart:', error);
      }
    }
  }, [selectedLabelColumn, selectedValueColumn, currentSheetData, processSelectedColumns]);

  // Cleanup effect to destroy chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, [chartInstance]);

  return (
    <div className="min-h-screen flex" style={{
      fontFamily: "'Poppins', sans-serif",
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)',
      color: '#2b2d42'
    }}>
      {/* Sidebar Navigation */}
      <div className="w-70 fixed h-screen overflow-y-auto z-50" style={{
        width: '280px',
        background: '#1e293b',
        color: 'white',
        padding: '25px 0',
        boxShadow: '5px 0 15px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '0 25px 25px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '25px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            fontSize: '1.5rem',
            fontWeight: 600
          }}>
            <i className="fas fa-robot" style={{ color: '#4895ef', fontSize: '1.8rem' }}></i>
            <span>AI Infographic</span>
          </div>
        </div>
        
        <div style={{
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          padding: '15px 25px 10px',
          color: '#94a3b8',
          marginTop: '20px'
        }}>Main Navigation</div>
        
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px 25px',
          color: '#cbd5e1',
          textDecoration: 'none',
          borderLeft: '4px solid transparent'
        }}>
          <i className="fas fa-home" style={{ width: '25px', textAlign: 'center' }}></i>
          <span>Home</span>
        </Link>
        
        <Link to="/dashboard" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px 25px',
          color: '#cbd5e1',
          textDecoration: 'none',
          borderLeft: '4px solid transparent'
        }}>
          <i className="fas fa-tachometer-alt" style={{ width: '25px', textAlign: 'center' }}></i>
          <span>Dashboard</span>
        </Link>
        
        <div style={{
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          padding: '15px 25px 10px',
          color: '#94a3b8',
          marginTop: '20px'
        }}>Features</div>
        
        <Link to="/file-to-chart" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px 25px',
          color: '#cbd5e1',
          textDecoration: 'none',
          borderLeft: '4px solid transparent'
        }}>
          <i className="fas fa-file-csv" style={{ width: '25px', textAlign: 'center' }}></i>
          <span>File to Chart</span>
        </Link>
        
        <Link to="/text-to-chart" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px 25px',
          color: '#cbd5e1',
          textDecoration: 'none',
          borderLeft: '4px solid transparent'
        }}>
          <i className="fas fa-keyboard" style={{ width: '25px', textAlign: 'center' }}></i>
          <span>Text to Chart</span>
        </Link>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          padding: '15px 25px',
          color: 'white',
          textDecoration: 'none',
          borderLeft: '4px solid #4895ef',
          background: 'rgba(67, 97, 238, 0.1)'
        }}>
          <i className="fas fa-film" style={{ width: '25px', textAlign: 'center' }}></i>
          <span>Animate Chart</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: '280px', padding: '30px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#2b2d42' }}>
            <i className="fas fa-film" style={{ color: '#4361ee', marginRight: '10px' }}></i>
            Animate Chart
          </div>
          <Link to="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#2b2d42'
          }}>
            <i className="fas fa-arrow-left"></i>
            Back to Dashboard
          </Link>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div style={{
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                       statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                       'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : 
                                 statusMessage.type === 'error' ? '#ef4444' : '#f59e0b'}`,
            color: statusMessage.type === 'success' ? '#10b981' : 
                   statusMessage.type === 'error' ? '#ef4444' : '#f59e0b'
          }}>
            {statusMessage.message}
          </div>
        )}

        {/* Main Content Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '30px',
          marginBottom: '40px'
        }}>
          {/* Upload Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '15px',
            padding: '30px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              marginBottom: '20px',
              color: '#2b2d42',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-upload" style={{ color: '#4361ee' }}></i>
              Upload Data File
            </h2>
            
            <div 
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: '3rem', color: '#4361ee', marginBottom: '15px' }}>
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#2b2d42' }}>
                Drop files here or click to browse
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Supports CSV, Excel (XLSX/XLS), JSON files
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Column Selection Controls - Show for all file types when data is available */}
            {(currentSheetData || chartData) && (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ marginBottom: '15px', color: '#2b2d42' }}>
                  <i className="fas fa-table"></i> Column Configuration
                </h4>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#2b2d42' }}>
                    Label Column
                  </label>
                  <select
                    value={selectedLabelColumn}
                    onChange={(e) => {
                      console.log('Label column changed to:', e.target.value);
                      setSelectedLabelColumn(e.target.value);
                      // Update chart when column changes
                      if (currentSheetData && e.target.value && selectedValueColumn) {
                        console.log('Updating chart with:', e.target.value, selectedValueColumn);
                        try {
                          const processedData = processSelectedColumns(currentSheetData, e.target.value, selectedValueColumn);
                          console.log('Processed data:', processedData);
                          setChartData(processedData);
                          createChart(processedData);
                          showStatus('Chart updated with new label column!', 'success');
                        } catch (error) {
                          console.error('Error updating chart:', error);
                          showStatus('Error updating chart', 'error');
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Select label column...</option>
                    {(currentSheetData ? Object.keys(currentSheetData[0] || {}) : chartData?.labels ? ['Auto-detected'] : []).map(column => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#2b2d42' }}>
                    Data Column
                  </label>
                  <select
                    value={selectedValueColumn}
                    onChange={(e) => {
                      console.log('Data column changed to:', e.target.value);
                      setSelectedValueColumn(e.target.value);
                      // Update chart when column changes
                      if (currentSheetData && selectedLabelColumn && e.target.value) {
                        console.log('Updating chart with:', selectedLabelColumn, e.target.value);
                        try {
                          const processedData = processSelectedColumns(currentSheetData, selectedLabelColumn, e.target.value);
                          console.log('Processed data:', processedData);
                          setChartData(processedData);
                          createChart(processedData);
                          showStatus('Chart updated with new data column!', 'success');
                        } catch (error) {
                          console.error('Error updating chart:', error);
                          showStatus('Error updating chart', 'error');
                        }
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Select data column...</option>
                    {(currentSheetData ? Object.keys(currentSheetData[0] || {}) : chartData?.datasets?.[0]?.label ? ['Auto-detected'] : []).map(column => (
                      <option key={column} value={column}>{column}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '5px' }}>
                    Choose any column to visualize data frequency or distribution
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                    Chart updates automatically when you change columns
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => setShowDataModal(true)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: '#e2e8f0',
                      color: '#2b2d42',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fas fa-eye"></i>
                    Preview Data
                  </button>

                  <button
                    onClick={() => {
                      console.log('Update Chart button clicked');
                      console.log('Current data:', { currentSheetData: !!currentSheetData, selectedLabelColumn, selectedValueColumn });

                      if (!currentSheetData) {
                        showStatus('No data available to update chart', 'warning');
                        return;
                      }

                      if (!selectedLabelColumn) {
                        showStatus('Please select a label column', 'warning');
                        return;
                      }

                      if (!selectedValueColumn) {
                        showStatus('Please select a data column', 'warning');
                        return;
                      }

                      try {
                        console.log('Processing with columns:', selectedLabelColumn, selectedValueColumn);
                        const processedData = processSelectedColumns(currentSheetData, selectedLabelColumn, selectedValueColumn);
                        console.log('New processed data:', processedData);

                        setChartData(processedData);

                        // Force chart recreation
                        setTimeout(() => {
                          createChart(processedData);
                        }, 100);

                        showStatus('Chart updated with selected columns!', 'success');
                      } catch (error) {
                        console.error('Error updating chart:', error);
                        showStatus(`Error updating chart: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
                      }
                    }}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: '#4361ee',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fas fa-sync"></i>
                    Update Chart
                  </button>
                </div>
              </div>
            )}

            {/* Chart Type Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#2b2d42' }}>
                Select Chart Type
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                gap: '8px',
                marginTop: '10px'
              }}>
                {chartTypes.map((type) => (
                  <div
                    key={type.type}
                    onClick={() => selectChartType(type.type)}
                    style={{
                      padding: '12px 8px',
                      border: currentChartType === type.type ? '2px solid #4361ee' : '2px solid #e2e8f0',
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: currentChartType === type.type ? '#4361ee' : 'white',
                      color: currentChartType === type.type ? 'white' : '#2b2d42'
                    }}
                  >
                    <i className={type.icon} style={{ fontSize: '1.3rem', marginBottom: '5px', display: 'block' }}></i>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{type.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Animation Controls */}
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ marginBottom: '15px', color: '#2b2d42' }}>
                <i className="fas fa-cog"></i> Animation Settings
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#2b2d42' }}>
                  Animation Duration: {animationDuration.toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={animationDuration}
                  onChange={(e) => updateDurationValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#2b2d42' }}>
                  Animation Style
                </label>
                <select
                  value={animationStyle}
                  onChange={(e) => setAnimationStyle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="easeInOutQuart">Smooth (Default)</option>
                  <option value="linear">Linear</option>
                  <option value="easeInQuart">Ease In</option>
                  <option value="easeOutQuart">Ease Out</option>
                  <option value="easeInOutBounce">Bouncy</option>
                  <option value="easeInOutElastic">Elastic</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#2b2d42' }}>
                  Delay Between Elements: {animationDelay}ms
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={animationDelay}
                  onChange={(e) => updateDelayValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px'
                  }}
                />
              </div>
            </div>

            {/* Animation Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginTop: '20px'
            }}>
              <button
                onClick={playAnimation}
                disabled={!chartData}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: '#4361ee',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: !chartData ? 0.6 : 1
                }}
              >
                <i className="fas fa-play"></i>
                Play Animation
              </button>
              
              <button
                onClick={resetAnimation}
                disabled={!chartData}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: '#e2e8f0',
                  color: '#2b2d42',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: !chartData ? 0.6 : 1
                }}
              >
                <i className="fas fa-redo"></i>
                Reset
              </button>
              
              <button
                onClick={downloadChart}
                disabled={!chartData}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: '#10b981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: !chartData ? 0.6 : 1
                }}
              >
                <i className="fas fa-download"></i>
                Download PNG
              </button>
              
              <button
                onClick={exportGif}
                disabled={!chartData || isExportingGif}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: isExportingGif ? '#9ca3af' : '#f59e0b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (!chartData || isExportingGif) ? 0.6 : 1
                }}
              >
                <i className={isExportingGif ? "fas fa-spinner fa-spin" : "fas fa-video"}></i>
                {isExportingGif ? 'Exporting...' : 'Export GIF'}
              </button>
            </div>

            {/* GIF Export Progress */}
            {isExportingGif && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '8px',
                border: '1px solid #f59e0b'
              }}>
                <div style={{ marginBottom: '8px', color: '#f59e0b', fontWeight: 500 }}>
                  Exporting GIF... {exportProgress}%
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: `${exportProgress}%`,
                    height: '100%',
                    background: '#f59e0b',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <button
                  onClick={() => {
                    setIsExportingGif(false);
                    setExportProgress(0);
                    showStatus('GIF export cancelled', 'warning');
                    if (chartInstance && chartData) {
                      chartInstance.data.datasets[0].data = [...chartData.datasets[0].data];
                      chartInstance.update('none');
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #f59e0b',
                    background: 'white',
                    color: '#f59e0b',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel Export
                </button>
              </div>
            )}

            {/* Sample Data Button */}
            <button
              onClick={generateSampleData}
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
                background: '#e2e8f0',
                color: '#2b2d42',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-database"></i>
              Load Sample Data
            </button>
          </div>

          {/* Chart Display Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '15px',
            padding: '30px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: 600,
              marginBottom: '20px',
              color: '#2b2d42',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-chart-area" style={{ color: '#4361ee' }}></i>
              Animated Chart Preview
            </h2>
            
            {isLoading && (
              <div style={{
                display: 'block',
                textAlign: 'center',
                padding: '20px'
              }}>
                <div style={{
                  border: '3px solid #f3f4f6',
                  borderTop: '3px solid #4361ee',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 15px'
                }}></div>
                <div>Processing your data...</div>
              </div>
            )}
            
            <div style={{
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              background: 'white',
              position: 'relative'
            }}>
              {!chartData && !isLoading ? (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-chart-line" style={{ fontSize: '4rem', marginBottom: '15px', color: '#cbd5e1' }}></i>
                  <div>Your animated chart will appear here</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>Upload a data file to get started</div>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    display: (chartData && !isLoading) ? 'block' : 'none'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Preview Modal */}
      {showDataModal && currentSheetData && (
        <div style={{
          display: 'block',
          position: 'fixed',
          zIndex: 2000,
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <div style={{
            background: 'white',
            margin: '5% auto',
            padding: '20px',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#2b2d42' }}>Data Preview</h3>
              <span
                onClick={() => setShowDataModal(false)}
                style={{ fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </span>
            </div>
            <div>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '15px'
              }}>
                <thead>
                  <tr>
                    {Object.keys(currentSheetData[0] || {}).map(column => (
                      <th key={column} style={{
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        textAlign: 'left',
                        background: '#f8fafc',
                        fontWeight: 600,
                        color: '#2b2d42'
                      }}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentSheetData.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} style={{
                          padding: '10px',
                          border: '1px solid #e2e8f0',
                          textAlign: 'left'
                        }}>
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentSheetData.length > 10 && (
                <p style={{ marginTop: '15px', color: '#64748b' }}>
                  Showing first 10 rows of {currentSheetData.length} total rows.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
