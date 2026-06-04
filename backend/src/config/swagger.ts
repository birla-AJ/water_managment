import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WaterFlow ERP API',
      version: '1.0.0',
      description:
        'REST API for the WaterFlow ERP Water Distribution Management System. ' +
        'Manages customers, schedules, orders, inventory, billing, payments and notifications.',
    },
    servers: [{ url: env.apiPrefix, description: 'Current server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication (admin & customer)' },
      { name: 'Customers', description: 'Customer management' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Inventory', description: 'Camper inventory' },
      { name: 'Billing', description: 'Invoices & billing' },
      { name: 'Payments', description: 'Razorpay payments' },
      { name: 'Deliveries', description: 'Delivery management' },
      { name: 'Notifications', description: 'Push notifications' },
      { name: 'Dashboard', description: 'Dashboard metrics' },
      { name: 'Reports', description: 'Reports & exports' },
      { name: 'Settings', description: 'Application settings' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.docs.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
