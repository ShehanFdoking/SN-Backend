# SNProducts Backend API

A comprehensive e-commerce backend built with Node.js, Express, and MongoDB. Supports three user roles: Admin, Officer, and User.

## Features

- **User Management** - Register, login, and profile management
- **Product Management** - Officers can add, edit, delete products
- **Shopping Cart** - Add/remove items, manage quantities
- **Order Management** - Create orders, track status updates
- **Delivery Management** - Officers manage deliveries with multilingual messages (English, Sinhala, Tamil)
- **News & Promotions** - Officers can post news and promotional content
- **Daily Activity History** - Generate PDF reports of daily activities
- **Notifications** - Real-time notifications for orders and deliveries
- **Role-Based Access Control** - Different permissions for Admin, Officer, and User

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Create .env file:**

   ```bash
   cp .env.example .env
   ```

3. **Configure .env variables:**
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/snproducts
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

## Running the Server

**Development mode (with auto-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Auth Routes

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Product Routes

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Officer/Admin)
- `PUT /api/products/:id` - Update product (Officer/Admin)
- `DELETE /api/products/:id` - Delete product (Officer/Admin)

### Cart Routes

- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `POST /api/cart/remove` - Remove item from cart
- `POST /api/cart/update-quantity` - Update item quantity

### Order Routes

- `POST /api/orders` - Create order
- `GET /api/orders/my-orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order
- `POST /api/orders/:id/cancel` - Cancel order

### Delivery Routes

- `POST /api/delivery/accept-order` - Accept order (Officer)
- `POST /api/delivery/reschedule` - Reschedule delivery with multilingual message
- `PUT /api/delivery/status/:id` - Update delivery status
- `POST /api/delivery/complete/:id` - Mark delivery as complete

### News & Promotion Routes

- `GET /api/news` - Get all news/promos
- `POST /api/news` - Create news/promo (Officer)
- `PUT /api/news/:id` - Update news/promo (Officer)
- `DELETE /api/news/:id` - Delete news/promo (Officer)

### History Routes

- `GET /api/history` - Get activity history
- `GET /api/history/daily` - Get daily history
- `GET /api/history/pdf` - Download history as PDF

### Admin Routes

- `POST /api/admin/officers` - Create officer
- `GET /api/admin/officers` - Get all officers
- `PUT /api/admin/officers/:id/deactivate` - Deactivate officer
- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/activity-summary` - Get activity summary

## User Roles

### User

- Browse products
- Register and login
- Add products to cart
- Create and manage orders
- View delivery status
- Receive notifications

### Officer

- Do everything a User can do
- Manage products (add, edit, delete)
- Accept orders and set expected delivery dates
- Reschedule deliveries with multilingual messages
- Create and update news/promotions
- View daily activity history and download PDF reports

### Admin

- Do everything Officer and User can do
- Create and manage officers
- View activity reports
- Monitor all platform activities

## Database Models

- **User** - User information with roles
- **Product** - Product details and inventory
- **Cart** - Shopping cart items
- **Order** - Order information and status
- **Notification** - User notifications
- **NewsPromo** - News and promotional content
- **Delivery** - Delivery tracking
- **OfficerHistory** - Activity logs for PDF reporting

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Server error

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based access control
- Input validation

## Support

For issues or questions, please contact support.
