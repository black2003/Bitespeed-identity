import express, { Request, Response } from 'express';
import cors from 'cors';
import { Database } from './database';
import { ContactService } from './contactService';
import { IdentifyRequest } from './types';
import path from 'path';

const app = express();
const port = Number(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../data/contacts.db')
  : './contacts.db';

if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const database = new Database(dbPath);
const contactService = new ContactService(database);


app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Bitespeed Identity Reconciliation Service',
    status: 'OK', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/identify', (req, res) => {
  res.send(`
    <h2>Welcome to the Identify Endpoint</h2>
    <p>This endpoint expects a <strong>POST</strong> request with the following JSON format:</p>
    <pre>
{
  "email": "user@example.com",
  "phoneNumber": "9876543210"
}
    </pre>
    <p>Use a tool like <a href="https://www.postman.com/" target="_blank">Postman</a> or <code>curl</code> to send a POST request.</p>
    <p>Example <code>curl</code> command:</p>
    <pre>
curl -X POST https://bitespeed-identity-mtm7.onrender.com/identify \\
  -H "Content-Type: application/json" \\
  -d '{"email": "user@example.com", "phoneNumber": "9876543210"}'
    </pre>
    <p> To test this tool without going to terminal or Postman, go to<a href="https://bitespeed-identity-mtm7.onrender.com/test-identify" target="_blank">Test</a> or use the link : https://bitespeed-identity-mtm7.onrender.com/test-identify ,\n
        it does the same job as /identify but it gives tester a premade frontend,\n
        To check the Health of endpoint go to  https://bitespeed-identity-mtm7.onrender.com/health. </p>
  `);
});

app.post('/identify', async (req: Request, res: Response): Promise<void> => {
  try {
    const request: IdentifyRequest = req.body;
    
    // Validate request
    if (!request.email && !request.phoneNumber) {
      res.status(400).json({
        error: 'Either email or phoneNumber must be provided'
      });
      return; // Important: explicit return
    }
    
    const response = await contactService.identify(request);
    res.json(response);
  } catch (error) {
    console.error('Error in /identify endpoint:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

app.get('/test-identify', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'test-identify.html'));
});

// Fix 4: Alternative approach using Response.send() method
/*app.post('/identify-alt', async (req: Request, res: Response) => {
  try {
    const request: IdentifyRequest = req.body;
    
    // Validate request
    if (!request.email && !request.phoneNumber) {
      return res.status(400).json({
        error: 'Either email or phoneNumber must be provided'
      });
    }
    
    const response = await contactService.identify(request);
    return res.json(response);
  } catch (error) {
    console.error('Error in /identify endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});
*/
// Catch all other routes
/*app.get(/(.*)/, (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});*/

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Bitespeed Identity Reconciliation Service running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Identify endpoint: POST http://localhost:${port}/identify`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  database.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  database.close();
  process.exit(0);
});
