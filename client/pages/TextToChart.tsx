import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Settings, Upload, BarChart3, FileText, Type, Sparkles, Download, Zap } from "lucide-react";

// Suppress ResizeObserver loop errors
const suppressResizeObserverError = () => {
  const resizeObserverErrorHandler = (e: ErrorEvent) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      e.stopImmediatePropagation();
      return false;
    }
  };
  window.addEventListener('error', resizeObserverErrorHandler);
  return () => window.removeEventListener('error', resizeObserverErrorHandler);
};

// Built-in CSV parser
const parseCSV = (text: string) => {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], data: [] };
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: {[key: string]: any} = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      // Try to parse as number
      const numValue = parseFloat(value);
      row[header] = isNaN(numValue) ? value : numValue;
    });
    return row;
  });
  
  return { headers, data };
};

// Built-in chart renderer using Canvas API
class SimpleChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = this.canvas.offsetWidth * 2; // High DPI
    this.canvas.height = this.canvas.offsetHeight * 2;
    this.ctx.scale(2, 2);
  }

  drawBarChart(labels: string[], values: number[], title: string) {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    const padding = 80;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 40; // Extra space for axis labels

    this.ctx.clearRect(0, 0, width, height);

    // Background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // Title
    this.ctx.fillStyle = '#1e293b';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, 30);

    // Y-axis title
    this.ctx.save();
    this.ctx.translate(20, height / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillStyle = '#374151';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Values', 0, 0);
    this.ctx.restore();

    // X-axis title
    this.ctx.fillStyle = '#374151';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Categories', width / 2, height - 10);

    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const barWidth = chartWidth / labels.length * 0.8;
    const barSpacing = chartWidth / labels.length * 0.2;

    // Y-axis scale labels
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxValue / ySteps) * i;
      const y = height - padding - (chartHeight / ySteps) * i;

      this.ctx.fillStyle = '#6b7280';
      this.ctx.font = '11px sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(value.toLocaleString(), padding - 5, y + 3);

      // Grid lines
      this.ctx.strokeStyle = '#f3f4f6';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(width - padding, y);
      this.ctx.stroke();
    }

    // Draw bars
    values.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = height - padding - barHeight;

      // Bar shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      this.ctx.fillRect(x + 2, y + 2, barWidth, barHeight);

      // Bar
      const gradient = this.ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#1d4ed8');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, barWidth, barHeight);

      // Bar border
      this.ctx.strokeStyle = '#1e40af';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, barWidth, barHeight);

      // Value label on top of bar
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(value.toLocaleString(), x + barWidth / 2, y - 8);

      // X-axis label
      this.ctx.fillStyle = '#4b5563';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'center';
      const label = labels[index].length > 12 ? labels[index].substring(0, 12) + '...' : labels[index];
      this.ctx.fillText(label, x + barWidth / 2, height - padding + 20);
    });

    // Y-axis
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(padding, padding);
    this.ctx.lineTo(padding, height - padding);
    this.ctx.stroke();

    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(width - padding, height - padding);
    this.ctx.stroke();
  }

  drawPieChart(labels: string[], values: number[], title: string) {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2 + 20;
    const radius = Math.min(width, height) / 3.5;

    this.ctx.clearRect(0, 0, width, height);

    // Background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // Title
    this.ctx.fillStyle = '#1e293b';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, 30);

    if (values.length === 0) return;

    const total = values.reduce((sum, val) => sum + val, 0);
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#06b6d4', '#8b5a2b'];

    let currentAngle = -Math.PI / 2;

    // Draw slices with shadows and borders
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;

      // Shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      this.ctx.beginPath();
      this.ctx.moveTo(centerX + 3, centerY + 3);
      this.ctx.arc(centerX + 3, centerY + 3, radius, currentAngle, currentAngle + sliceAngle);
      this.ctx.closePath();
      this.ctx.fill();

      // Main slice
      this.ctx.fillStyle = colors[index % colors.length];
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      this.ctx.closePath();
      this.ctx.fill();

      // Slice border
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Reset angle for labels
    currentAngle = -Math.PI / 2;

    // Draw labels and legend
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const labelAngle = currentAngle + sliceAngle / 2;
      const percentage = ((value / total) * 100).toFixed(1);

      // Only show label if slice is large enough
      if (percentage > 3) {
        const labelRadius = radius * 0.7;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${percentage}%`, labelX, labelY);
      }

      currentAngle += sliceAngle;
    });

    // Draw legend
    const legendStartY = centerY + radius + 30;
    const legendItemHeight = 20;
    const legendCols = Math.ceil(labels.length / 6);
    const legendColWidth = width / legendCols;

    labels.forEach((label, index) => {
      const col = index % legendCols;
      const row = Math.floor(index / legendCols);
      const x = col * legendColWidth + 20;
      const y = legendStartY + row * legendItemHeight;

      // Color box
      this.ctx.fillStyle = colors[index % colors.length];
      this.ctx.fillRect(x, y - 8, 12, 12);
      this.ctx.strokeStyle = '#374151';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y - 8, 12, 12);

      // Label text
      this.ctx.fillStyle = '#374151';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'left';
      const percentage = ((values[index] / total) * 100).toFixed(1);
      const labelText = label.length > 15 ? label.substring(0, 15) + '...' : label;
      this.ctx.fillText(`${labelText} (${percentage}%)`, x + 18, y);
    });
  }

  drawLineChart(labels: string[], values: number[], title: string) {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    const padding = 80;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 40;

    this.ctx.clearRect(0, 0, width, height);

    // Background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // Title
    this.ctx.fillStyle = '#1e293b';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, 30);

    // Y-axis title
    this.ctx.save();
    this.ctx.translate(20, height / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillStyle = '#374151';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Values', 0, 0);
    this.ctx.restore();

    // X-axis title
    this.ctx.fillStyle = '#374151';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Time/Categories', width / 2, height - 10);

    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue || 1;

    // Y-axis scale labels and grid
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = minValue + (valueRange / ySteps) * i;
      const y = height - padding - (chartHeight / ySteps) * i;

      // Y-axis labels
      this.ctx.fillStyle = '#6b7280';
      this.ctx.font = '11px sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(value.toLocaleString(), padding - 5, y + 3);

      // Horizontal grid lines
      this.ctx.strokeStyle = '#f3f4f6';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(width - padding, y);
      this.ctx.stroke();
    }

    // Vertical grid lines
    values.forEach((value, index) => {
      const x = padding + (chartWidth / (values.length - 1)) * index;
      this.ctx.strokeStyle = '#f9fafb';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding);
      this.ctx.lineTo(x, height - padding);
      this.ctx.stroke();
    });

    // Draw area under line
    this.ctx.beginPath();
    const firstX = padding;
    const firstY = height - padding - ((values[0] - minValue) / valueRange) * chartHeight;
    this.ctx.moveTo(firstX, height - padding);
    this.ctx.lineTo(firstX, firstY);

    values.forEach((value, index) => {
      const x = padding + (chartWidth / (values.length - 1)) * index;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
      this.ctx.lineTo(x, y);
    });

    const lastX = padding + chartWidth;
    this.ctx.lineTo(lastX, height - padding);
    this.ctx.closePath();

    const gradient = this.ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw main line
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();

    values.forEach((value, index) => {
      const x = padding + (chartWidth / (values.length - 1)) * index;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();

    // Draw points with shadows
    values.forEach((value, index) => {
      const x = padding + (chartWidth / (values.length - 1)) * index;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;

      // Point shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(x + 1, y + 1, 6, 0, 2 * Math.PI);
      this.ctx.fill();

      // Point border
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6, 0, 2 * Math.PI);
      this.ctx.fill();

      // Point center
      this.ctx.fillStyle = '#1d4ed8';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
      this.ctx.fill();

      // Value label above point
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(value.toLocaleString(), x, y - 15);

      // X-axis label
      this.ctx.fillStyle = '#4b5563';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'center';
      const label = labels[index].length > 10 ? labels[index].substring(0, 10) + '...' : labels[index];
      this.ctx.fillText(label, x, height - padding + 20);
    });

    // Draw axes
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(padding, padding);
    this.ctx.lineTo(padding, height - padding);
    this.ctx.moveTo(padding, height - padding);
    this.ctx.lineTo(width - padding, height - padding);
    this.ctx.stroke();
  }
}

export default function TextToChart() {
  const [activeTab, setActiveTab] = useState('text');
  const [currentData, setCurrentData] = useState<any[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const secondaryCanvasRef = useRef<HTMLCanvasElement>(null);

  // Suppress ResizeObserver errors on component mount
  useEffect(() => {
    const cleanup = suppressResizeObserverError();
    return cleanup;
  }, []);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setShowAnalysis(false);
  };

  const loadExampleData = () => {
    const examples = [
      `Category,Sales,Quarter
Electronics,15000,Q1
Clothing,12000,Q1
Books,8000,Q1
Electronics,18000,Q2
Clothing,14000,Q2
Books,9000,Q2`,
      `Product,Revenue,Growth
iPhone,120000,15.2
Samsung,95000,12.1
Google,45000,8.9
OnePlus,25000,22.3`,
      `Month,Users,Conversion
Jan,1200,3.2
Feb,1350,3.8
Mar,1180,2.9
Apr,1480,4.1
May,1650,4.6`
    ];

    const selectedExample = examples[Math.floor(Math.random() * examples.length)];
    const textarea = document.getElementById('dataInput') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = selectedExample;
      alert('Example data loaded successfully!');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const textarea = document.getElementById('dataInput') as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = text;
        }
      };
      reader.readAsText(file);
    }
  };

  const analyzeData = () => {
    const textarea = document.getElementById('dataInput') as HTMLTextAreaElement;
    const textData = textarea?.value?.trim();
    
    if (!textData) {
      alert('Please upload a file or paste data first!');
      return;
    }

    try {
      const { headers, data } = parseCSV(textData);
      
      if (data.length === 0) {
        alert('No data found. Please check your CSV format.');
        return;
      }

      setCurrentData(data);
      
      // Generate insights
      const insights = [
        `📌 Found ${headers.length} columns and ${data.length} rows of data`,
        `📊 Columns: ${headers.join(', ')}`,
        `🔍 Sample data: ${JSON.stringify(data[0], null, 2)}`
      ];

      const numericColumns = headers.filter(header => {
        return data.some(row => typeof row[header] === 'number');
      });

      if (numericColumns.length > 0) {
        insights.push(`📈 Numeric columns: ${numericColumns.join(', ')}`);
      }

      setAnalysisResults(insights);
      setShowAnalysis(true);

      // Create charts
      setTimeout(() => {
        createCharts(headers, data);
      }, 100);

    } catch (error) {
      alert('Error parsing data. Please check your CSV format.');
      console.error('Parse error:', error);
    }
  };

  const createCharts = (headers: string[], data: any[]) => {
    if (!canvasRef.current) return;

    const numericColumns = headers.filter(header => {
      return data.some(row => typeof row[header] === 'number');
    });

    const categoricalColumns = headers.filter(header => {
      return !numericColumns.includes(header);
    });

    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      // Group data by category and sum numeric values
      const catCol = categoricalColumns[0];
      const numCol = numericColumns[0];
      
      const grouped: {[key: string]: number} = {};
      data.forEach(row => {
        const category = row[catCol];
        const value = row[numCol] || 0;
        grouped[category] = (grouped[category] || 0) + value;
      });

      const labels = Object.keys(grouped);
      const values = Object.values(grouped);

      const chart = new SimpleChart(canvasRef.current);
      chart.drawBarChart(labels, values, `${numCol} by ${catCol}`);

      // Create secondary chart
      if (secondaryCanvasRef.current) {
        const secondaryChart = new SimpleChart(secondaryCanvasRef.current);
        secondaryChart.drawPieChart(labels, values, `Distribution of ${numCol}`);
      }
    }
  };

  const generateSmartChart = () => {
    const textarea = document.getElementById("textInput") as HTMLTextAreaElement;
    const input = textarea?.value;
    const selectElement = document.getElementById("chartType") as HTMLSelectElement;
    const selectedType = selectElement?.value || 'bar';

    if (!input?.trim()) {
      alert("Please enter some data to visualize!");
      return;
    }

    const result = extractDataFromText(input);
    if (!result || result.labels.length === 0) {
      alert("I couldn't understand the data format. Please try examples like:\n• 'Male 55%, Female 45%'\n• 'Q1 100, Q2 150, Q3 120'");
      return;
    }

    setShowAnalysis(true);
    setAnalysisResults([`✓ Interpreted as: ${result.labels.join(', ')} with values ${result.values.join(', ')}`]);

    setTimeout(() => {
      if (canvasRef.current) {
        const chart = new SimpleChart(canvasRef.current);
        
        if (selectedType === 'pie') {
          chart.drawPieChart(result.labels, result.values, 'Smart Data Visualization');
        } else if (selectedType === 'line') {
          chart.drawLineChart(result.labels, result.values, 'Smart Data Visualization');
        } else {
          chart.drawBarChart(result.labels, result.values, 'Smart Data Visualization');
        }
      }
    }, 100);
  };

  const extractDataFromText = (input: string) => {
    // Simple text parsing for basic patterns
    const patterns = [
      /([a-zA-Z][a-zA-Z\s]*?)[\s:]+(\d+(?:\.\d+)?(?:%|k|m)?)/gi,
    ];

    for (const pattern of patterns) {
      const labels: string[] = [];
      const values: number[] = [];
      let match;
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(input)) !== null) {
        const label = match[1].trim();
        const valueStr = match[2];
        let value = parseFloat(valueStr.replace(/[^\d.]/g, ''));
        
        if (valueStr.includes('k')) value *= 1000;
        if (valueStr.includes('m')) value *= 1000000;
        
        if (label.length > 0 && !isNaN(value)) {
          labels.push(label.charAt(0).toUpperCase() + label.slice(1));
          values.push(value);
        }
      }

      if (labels.length >= 2) {
        return { labels, values };
      }
    }

    return null;
  };

  const downloadChart = (format: string) => {
    if (!canvasRef.current) {
      alert("Please generate a chart first!");
      return;
    }
    
    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `chart-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-slate-300"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🤖 Built-in Chart Generator
              </h1>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Tab Navigation */}
        <div className="flex mb-8 bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm">
          <button
            className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
              activeTab === 'csv'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
            }`}
            onClick={() => switchTab('csv')}
          >
            <BarChart3 className="h-5 w-5" />
            <span>📊 Data Analyzer</span>
          </button>
          <button
            className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
              activeTab === 'text'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
            }`}
            onClick={() => switchTab('text')}
          >
            <Sparkles className="h-5 w-5" />
            <span>✨ Smart Text to Chart</span>
          </button>
        </div>

        {/* CSV Data Analyzer Tab */}
        {activeTab === 'csv' && (
          <div className="space-y-6">
            <Card className="border-2 border-dashed border-slate-300 bg-white/50 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex space-x-4">
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      onClick={() => document.getElementById('fileInput')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      📁 Upload CSV File
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={loadExampleData}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      🎯 Load Example Data
                    </Button>
                  </div>
                  <input 
                    type="file" 
                    id="fileInput" 
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <p className="text-slate-600">
                    Supported formats: CSV, TXT (comma-separated values)
                  </p>
                </div>
                
                <Textarea
                  id="dataInput"
                  className="mt-6 min-h-[200px] font-mono text-sm"
                  placeholder={`Paste your CSV data here...

Example format:
Category,Sales,Quarter
Electronics,15000,Q1
Clothing,12000,Q1
Books,8000,Q1`}
                />
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-4">
              <Button 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                onClick={analyzeData}
              >
                <Zap className="h-4 w-4 mr-2" />
                🔍 Analyze Data
              </Button>
              <Button variant="outline" onClick={() => downloadChart('png')}>
                <Download className="h-4 w-4 mr-2" />
                📥 Download PNG
              </Button>
            </div>
          </div>
        )}

        {/* Text to Chart Tab */}
        {activeTab === 'text' && (
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="h-5 w-5" />
                  <span>Smart Text to Chart</span>
                </CardTitle>
                <CardDescription>
                  Describe your data in natural language and create charts instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  id="textInput"
                  className="min-h-[120px]"
                  placeholder={`Examples:
• Sales Q1 100, Q2 150, Q3 120, Q4 180
• iPhone 35%, Android 60%, Others 5%
• Jan 1200, Feb 1350, Mar 1180, Apr 1480`}
                />
                
                <div className="flex flex-wrap gap-4 items-center">
                  <select 
                    id="chartType"
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                  
                  <Button 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    onClick={generateSmartChart}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    ✨ Generate Chart
                  </Button>
                  
                  <Button variant="outline" onClick={() => downloadChart('png')}>
                    <Download className="h-4 w-4 mr-2" />
                    📥 Download PNG
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Examples Card */}
            <Card className="bg-white/60 backdrop-blur-sm border-0">
              <CardHeader>
                <CardTitle className="text-lg">Smart Input Examples</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-800">Time Series:</div>
                    <div className="text-sm text-blue-600">"Q1 100, Q2 150, Q3 120, Q4 180"</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800">Percentages:</div>
                    <div className="text-sm text-green-600">"iPhone 35%, Android 60%, Others 5%"</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-800">Sales Data:</div>
                    <div className="text-sm text-purple-600">"Product A 15000, Product B 12000, Product C 8000"</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="font-medium text-orange-800">Monthly Data:</div>
                    <div className="text-sm text-orange-600">"Jan 1200, Feb 1350, Mar 1180"</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Results */}
        {showAnalysis && (
          <div className="space-y-6 mt-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-800">📊 Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResults.map((insight, index) => (
                    <p key={index} className="text-slate-700">{insight}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Primary Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-96">
                    <canvas ref={canvasRef} className="w-full h-full border rounded-lg"></canvas>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Secondary Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-96">
                    <canvas ref={secondaryCanvasRef} className="w-full h-full border rounded-lg"></canvas>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
