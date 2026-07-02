import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit for Base64 image upload
app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Gemini Receipt Scanner
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    // Clean up base64 string if it contains the prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this receipt or bank transfer slip image and extract details. Return a JSON object with the following fields:
- totalAmount: The total cost of the transaction (number)
- date: The transaction date in YYYY-MM-DD format (string, if not found use current date)
- storeName: The name of the store, merchant, bank, or transfer service (string)
- description: A short list of main items or description (string)
- isTransferBetweenOwnAccounts: true only when this is a money transfer slip and the sender name and receiver name appear to be the same person or the same owner. If sender/receiver names are different, return false.
- transferSenderName: Sender / payer name from a transfer slip, or empty string.
- transferReceiverName: Receiver / payee name from a transfer slip, or empty string.
- suggestedCategory: The expense category. Choose EXACTLY one of these categories:
  "อาหารและเครื่องดื่ม (Food & Drinks)"
  "ช้อปปิ้ง (Shopping)"
  "การเดินทางและยานพาหนะ (Transport)"
  "บิลและสาธารณูปโภค (Bills & Utilities)"
  "ที่อยู่อาศัย (Housing)"
  "สุขภาพและการแพทย์ (Health & Medical)"
  "ความบันเทิง (Entertainment)"
  "การศึกษา (Education)"
  "รายจ่ายอื่นๆ (Others)"
`
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || 'image/jpeg'
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            totalAmount: { type: 'NUMBER' },
            date: { type: 'STRING' },
            storeName: { type: 'STRING' },
            description: { type: 'STRING' },
            isTransferBetweenOwnAccounts: { type: 'BOOLEAN' },
            transferSenderName: { type: 'STRING' },
            transferReceiverName: { type: 'STRING' },
            suggestedCategory: { type: 'STRING' }
          },
          required: ['totalAmount', 'date', 'storeName', 'isTransferBetweenOwnAccounts', 'suggestedCategory']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const parsedData = JSON.parse(text);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Gemini Scanning Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to scan receipt' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
