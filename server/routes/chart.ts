import express from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { Request, Response } from 'express';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

interface UploadRequest extends Request {
  file: Express.Multer.File;
}

interface ChartRequest extends Request {
  file: Express.Multer.File;
  body: {
    labelColumn: string;
    valueColumn: string;
  };
}

// Parse CSV and return headers
router.post('/upload-headers', upload.single('file'), (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const csvText = req.file.buffer.toString('utf8');
    
    // Parse CSV to get headers
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      preview: 1 // Only parse first row to get headers
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV parsing error',
        details: parseResult.errors.map(err => err.message).join(', ')
      });
    }

    const headers = parseResult.meta.fields || [];
    
    if (headers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No headers found in CSV file'
      });
    }

    res.json({
      success: true,
      headers: headers
    });

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate chart data from CSV
router.post('/generate-chart', upload.single('file'), (req: ChartRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { labelColumn, valueColumn } = req.body;
    
    if (!labelColumn || !valueColumn) {
      return res.status(400).json({
        success: false,
        error: 'Label column and value column are required'
      });
    }

    const csvText = req.file.buffer.toString('utf8');
    
    // Parse CSV
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true // Automatically convert numbers
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV parsing error',
        details: parseResult.errors.map(err => err.message).join(', ')
      });
    }

    const data = parseResult.data as Record<string, any>[];
    
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data found in CSV file'
      });
    }

    // Extract labels and values
    const labels: string[] = [];
    const values: number[] = [];

    data.forEach((row, index) => {
      // Get label - fallback to index if empty
      const label = row[labelColumn] || `Item ${index + 1}`;
      labels.push(String(label));

      // Get value - try to convert to number
      let value = row[valueColumn];
      
      if (typeof value === 'string') {
        // Remove commas, currency symbols, etc.
        const cleanValue = value.replace(/[,$%]/g, '');
        value = parseFloat(cleanValue);
      }
      
      if (isNaN(value) || value === null || value === undefined) {
        value = 0; // Default to 0 for non-numeric values
      }
      
      values.push(Number(value));
    });

    // Validate we have data
    if (labels.length === 0 || values.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid data extracted from selected columns'
      });
    }

    // Limit data points for performance (optional)
    const maxDataPoints = 100;
    if (labels.length > maxDataPoints) {
      return res.json({
        success: true,
        labels: labels.slice(0, maxDataPoints),
        values: values.slice(0, maxDataPoints),
        warning: `Data truncated to ${maxDataPoints} points for performance`
      });
    }

    res.json({
      success: true,
      labels: labels,
      values: values,
      totalRows: data.length
    });

  } catch (error) {
    console.error('Error generating chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Chart API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
