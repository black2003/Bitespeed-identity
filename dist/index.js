"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./database");
const contactService_1 = require("./contactService");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Database setup
const dbPath = process.env.NODE_ENV === 'production'
    ? path_1.default.join(__dirname, '../data/contacts.db')
    : './contacts.db';
if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const dataDir = path_1.default.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}
const database = new database_1.Database(dbPath);
const contactService = new contactService_1.ContactService(database);
// Fix 2: Properly typed route handlers
app.get('/', (req, res) => {
    res.json({
        message: 'Bitespeed Identity Reconciliation Service',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Fix 3: Main identify endpoint with proper async handling
app.post('/identify', async (req, res) => {
    try {
        const request = req.body;
        // Validate request
        if (!request.email && !request.phoneNumber) {
            res.status(400).json({
                error: 'Either email or phoneNumber must be provided'
            });
            return; // Important: explicit return
        }
        const response = await contactService.identify(request);
        res.json(response);
    }
    catch (error) {
        console.error('Error in /identify endpoint:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
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
app.all('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
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
