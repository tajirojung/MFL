import { GoogleGenAI } from '@google/genai';

const json = (res: any, status: number, body: Record<string, unknown>) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { image, mimeType } = body || {};

    if (!image) {
      return json(res, 400, { error: 'Missing image data' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json(res, 500, { error: 'GEMINI_API_KEY is not configured on Vercel' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = String(image).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this receipt image and extract details. Return a JSON object with the following fields:
- totalAmount: The total cost of the transaction (number)
- date: The transaction date in YYYY-MM-DD format (string, if not found use current date)
- storeName: The name of the store or merchant (string)
- description: A short list of main items or description (string)
- suggestedCategory: The expense category. Choose EXACTLY one of these categories:
  "อาหารและเครื่องดื่ม (Food & Drinks)"
  "ช้อปปิ้ง (Shopping)"
  "การเดินทางและยานพาหนะ (Transport)"
  "บิลและสาธารณูปโภค (Bills & Utilities)"
  "ที่อยู่อาศัย (Housing)"
  "สุขภาพและการแพทย์ (Health & Medical)"
  "ความบันเทิง (Entertainment)"
  "การศึกษา (Education)"
  "รายจ่ายอื่นๆ (Others)"`
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
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
            suggestedCategory: { type: 'STRING' },
          },
          required: ['totalAmount', 'date', 'storeName', 'suggestedCategory'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini API');
    }

    return json(res, 200, JSON.parse(response.text));
  } catch (error: any) {
    console.error('Gemini Scanning Error:', error);
    return json(res, 500, { error: error.message || 'Failed to scan receipt' });
  }
}
