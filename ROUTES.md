# Tradia Routes Documentation

This document explains all the routes and paths available in the Tradia application. Tradia is built using Next.js 13+ with the App Router pattern.

## Table of Contents
- [Public Pages](#public-pages)
- [Authentication Pages](#authentication-pages)
- [Dashboard Pages](#dashboard-pages)
- [API Endpoints](#api-endpoints)
  - [Authentication APIs](#authentication-apis)
  - [Trade APIs](#trade-apis)
  - [MT5 Integration APIs](#mt5-integration-apis)
  - [Payment APIs](#payment-apis)
  - [AI & Coach APIs](#ai--coach-apis)
  - [User Management APIs](#user-management-apis)
  - [Analytics APIs](#analytics-apis)

---

## Public Pages

These pages are accessible to anyone without authentication:

### `/` (Home/Landing Page)
- **Purpose**: Main landing page for Tradia
- **Features**:
  - Overview of Tradia's AI-powered trading performance assistant
  - Feature highlights (Smart Performance Tracking, Secure & Private, Lightning-Fast Feedback, Trade Anywhere)
  - Call-to-action buttons to sign up or login
  - Responsive design for mobile and desktop

### `/about`
- **Purpose**: Information about Tradia
- **Features**: Company background, mission, and team information

### `/contact`
- **Purpose**: Contact page for user inquiries
- **Features**: Form to reach out to Tradia support team

### `/pricing`
- **Purpose**: Display subscription plans and pricing
- **Features**:
  - Free plan ($0/month)
  - Pro plan ($9/month or $90/year)
  - Plus plan ($19/month or $190/year)
  - Elite plan ($39/month or $390/year)
  - Feature comparison between plans

### `/privacy`
- **Purpose**: Privacy policy page
- **Features**: Details on how user data is collected, used, and protected

### `/terms`
- **Purpose**: Terms of service page
- **Features**: Legal terms and conditions for using Tradia

---

## Authentication Pages

These pages handle user authentication and account management:

### `/login`
- **Purpose**: User login page
- **Features**:
  - Email and password login
  - Google OAuth login option
  - "Remember me" functionality
  - Link to forgot password
  - Link to signup page

### `/signup`
- **Purpose**: New user registration
- **Features**:
  - Email and password registration
  - Google OAuth signup option
  - Email verification required
  - Password strength validation

### `/forgot-password`
- **Purpose**: Password reset request
- **Features**:
  - Email input to request password reset
  - Sends reset link to user's email

### `/reset-password`
- **Purpose**: Set new password after reset request
- **Features**:
  - Token-based password reset
  - New password confirmation

### `/verify-email`
- **Purpose**: Email verification landing page
- **Features**:
  - Verifies user email with token from email link
  - Sub-routes:
    - `/verify-email/success` - Successful verification confirmation
    - `/verify-email/failed` - Failed verification message

### `/resend-verification`
- **Purpose**: Resend email verification link
- **Features**:
  - For users who didn't receive or lost verification email

### `/check-email`
- **Purpose**: Confirmation page after signup
- **Features**:
  - Informs user to check email for verification link

---

## Dashboard Pages

Protected pages requiring authentication. All dashboard pages are under the `/dashboard` route:

### `/dashboard` (Main Dashboard)
- **Purpose**: Central hub for trading performance
- **Features**:
  - Overview cards with key metrics (total trades, win rate, profit/loss, etc.)
  - Trade history table
  - Mental coach section with AI insights
  - Weekly coach recap
  - Risk guard alerts
  - Risk metrics visualization
  - Position sizing calculator
  - Trade journal
  - Trade analytics with charts
  - Trade planner
  - AI chat interface
  - MT5 integration wizard
  - Multiple tabs for different views:
    - Overview
    - Analytics
    - Journal
    - Planner
    - Risk Management
    - Education
    - MT5 Integration
    - AI Coach

### `/dashboard/analytics`
- **Purpose**: Detailed trading analytics page
- **Features**:
  - Performance charts (line, bar, pie, donut)
  - Time-based insights
  - Pair-level performance breakdown
  - Win rate, profit factor, drawdown analysis
  - Powered by Plotly for interactive visualizations

### `/dashboard/profile`
- **Purpose**: User profile management
- **Features**:
  - View and edit personal information
  - Avatar upload
  - Account details

### `/dashboard/settings`
- **Purpose**: User preferences and settings
- **Features**:
  - Account settings
  - Notification preferences
  - Password change
  - Theme settings (dark/light mode)

### `/dashboard/billing`
- **Purpose**: Subscription and billing management
- **Features**:
  - Current plan information
  - Upgrade/downgrade options
  - Payment history
  - Invoice downloads

### `/dashboard/mt5/connect`
- **Purpose**: MT5 (MetaTrader 5) account connection
- **Features**:
  - Connect MT5 trading account
  - Input MT5 credentials
  - Account validation
  - Multiple account management

### `/dashboard/mt5/sync`
- **Purpose**: Synchronize MT5 trade data
- **Features**:
  - Manual and automatic sync options
  - View sync status
  - Import trades from MT5 account

---

## API Endpoints

All API endpoints are under the `/api` route and return JSON responses.

### Authentication APIs

#### `POST /api/auth/signup`
- **Purpose**: Create new user account
- **Body**: `{ email, password, name }`
- **Returns**: User object or error

#### `POST /api/auth/login`
- **Purpose**: Authenticate user
- **Body**: `{ email, password }`
- **Returns**: JWT token and user session

#### `POST /api/auth/forgot-password`
- **Purpose**: Request password reset
- **Body**: `{ email }`
- **Returns**: Success message

#### `POST /api/auth/reset-password`
- **Purpose**: Reset password with token
- **Body**: `{ token, newPassword }`
- **Returns**: Success message

#### `GET /api/auth/verify-email`
- **Purpose**: Verify user email address via token (from email link)
- **Query Parameters**: `token` - Verification token from email
- **Returns**: Redirects to `/verify-email/success` or `/verify-email/failed`

#### `POST /api/auth/verify-email`
- **Purpose**: Programmatic email verification (for server-to-server calls)
- **Body**: `{ token }`
- **Returns**: JSON response `{ ok: true }` or error

#### `POST /api/auth/resend-verification`
- **Purpose**: Resend verification email
- **Body**: `{ email }`
- **Returns**: Success message

#### `POST /api/auth/change-password`
- **Purpose**: Change password for authenticated user
- **Body**: `{ currentPassword, newPassword }`
- **Returns**: Success message

#### `POST /api/auth/refresh`
- **Purpose**: Refresh authentication token
- **Returns**: New JWT token

#### `GET/POST /api/auth/[...nextauth]`
- **Purpose**: NextAuth.js authentication handler
- **Features**: Handles OAuth and session management

---

### Trade APIs

#### `GET /api/trades`
- **Purpose**: Fetch user's trade history
- **Query Parameters**:
  - `limit` - Number of trades to return (default: 100)
  - `offset` - Pagination offset (default: 0)
  - `symbol` - Filter by trading symbol
  - `outcome` - Filter by win/loss
  - `fromDate` - Start date filter
  - `toDate` - End date filter
- **Returns**: Array of trade objects

#### `POST /api/trades`
- **Purpose**: Create new trade manually
- **Body**: Trade details (symbol, entry, exit, profit, etc.)
- **Returns**: Created trade object

#### `POST /api/trades/import`
- **Purpose**: Import trades from CSV/XLSX file
- **Body**: File upload with trade data
- **Returns**: Import summary (success count, errors)

---

### MT5 Integration APIs

#### `GET /api/mt5/accounts`
- **Purpose**: Get user's connected MT5 accounts
- **Returns**: Array of MT5 account objects

#### `POST /api/mt5/accounts`
- **Purpose**: Add new MT5 account
- **Body**: MT5 account credentials
- **Returns**: Created account object

#### `GET /api/mt5/accounts/[id]`
- **Purpose**: Get specific MT5 account details
- **Returns**: MT5 account object

#### `PUT /api/mt5/accounts/[id]`
- **Purpose**: Update MT5 account
- **Body**: Updated account details
- **Returns**: Updated account object

#### `DELETE /api/mt5/accounts/[id]`
- **Purpose**: Remove MT5 account
- **Returns**: Success message

#### `POST /api/mt5/connect`
- **Purpose**: Establish connection to MT5 account
- **Body**: MT5 credentials and server details
- **Returns**: Connection status

#### `POST /api/mt5/validate`
- **Purpose**: Validate MT5 credentials
- **Body**: MT5 credentials
- **Returns**: Validation result

#### `GET /api/mt5/account-info`
- **Purpose**: Get MT5 account information
- **Query Parameters**: `accountId`
- **Returns**: Account balance, equity, margin info

#### `POST /api/mt5/sync`
- **Purpose**: Synchronize trades from MT5 account
- **Body**: `{ accountId }`
- **Returns**: Sync status and imported trade count

#### `POST /api/mt5/import`
- **Purpose**: Import specific trades from MT5
- **Body**: Trade selection criteria
- **Returns**: Imported trades

#### `GET /api/mt5/orders`
- **Purpose**: Get open orders from MT5
- **Query Parameters**: `accountId`
- **Returns**: Array of open orders

#### `GET /api/mt5/positions`
- **Purpose**: Get open positions from MT5
- **Query Parameters**: `accountId`
- **Returns**: Array of open positions

#### `GET /api/mt5/monitoring`
- **Purpose**: Get MT5 account monitoring status
- **Returns**: Connection status, last sync time

#### `GET /api/mt5/credentials`
- **Purpose**: Get stored MT5 credentials (encrypted)
- **Returns**: Array of credential objects

#### `POST /api/mt5/credentials`
- **Purpose**: Store new MT5 credentials
- **Body**: Credential details
- **Returns**: Created credential object

#### `DELETE /api/mt5/credentials/[id]`
- **Purpose**: Delete stored credentials
- **Returns**: Success message

---

### Payment APIs

#### `POST /api/payments/create-checkout`
- **Purpose**: Create payment checkout session
- **Body**: `{ planId, billingPeriod }`
- **Returns**: Checkout URL or payment intent

#### `POST /api/payments/webhook`
- **Purpose**: Handle payment provider webhooks
- **Body**: Webhook payload from payment provider
- **Returns**: Acknowledgment

#### `POST /api/payments/webhook/flutterwave`
- **Purpose**: Specific webhook for Flutterwave payments
- **Body**: Flutterwave webhook payload
- **Returns**: Acknowledgment

#### `GET /api/payments/subscriptions`
- **Purpose**: Get user's active subscriptions
- **Returns**: Array of subscription objects

#### `POST /api/payments/verify`
- **Purpose**: Verify payment transaction
- **Body**: `{ transactionId }`
- **Returns**: Payment verification status

---

### AI & Coach APIs

#### `POST /api/ai/chat`
- **Purpose**: AI chatbot for trading insights
- **Body**: 
  ```json
  {
    "message": "User question (string, required if no attachments)",
    "tradeHistory": "Array of trade objects (optional, for context)",
    "attachments": "Array of file metadata objects (optional)",
    "conversationHistory": "Array of previous messages (optional, for context)"
  }
  ```
  - `message` (string, required*): The user's question or prompt (* required if attachments not provided)
  - `tradeHistory` (array, optional): User's trade data for personalized insights
  - `attachments` (array, optional): File metadata for analysis `[{ name, type, size }]`
  - `conversationHistory` (array, optional): Previous chat messages for context `[{ role: 'user'|'assistant', content: string }]`
- **Returns**: AI-generated response with trading insights

#### `POST /api/ai/voice`
- **Purpose**: AI voice coach for spoken feedback
- **Body**: Voice input or text for voice synthesis
- **Returns**: Audio response or voice feedback

#### `GET /api/coach/points`
- **Purpose**: Get coaching points for user
- **Returns**: Actionable coaching recommendations

#### `POST /api/coach/weekly-email`
- **Purpose**: Send weekly coaching recap email
- **Returns**: Email send status

---

### User Management APIs

#### `GET /api/user/profile`
- **Purpose**: Get user profile information
- **Returns**: User profile object

#### `PUT /api/user/profile`
- **Purpose**: Update user profile
- **Body**: Updated profile fields
- **Returns**: Updated profile object

#### `POST /api/user/update`
- **Purpose**: Update user account information
- **Body**: User details to update
- **Returns**: Updated user object

#### `GET /api/user/settings`
- **Purpose**: Get user settings
- **Returns**: Settings object

#### `PUT /api/user/settings`
- **Purpose**: Update user settings
- **Body**: Settings to update
- **Returns**: Updated settings

#### `GET /api/user/plan`
- **Purpose**: Get user's subscription plan
- **Returns**: Plan details (Free, Pro, Plus, Elite)

#### `GET /api/user/trial-status`
- **Purpose**: Check if user is in trial period
- **Returns**: Trial status and expiry date

#### `POST /api/user/upload-avatar`
- **Purpose**: Upload user profile picture
- **Body**: Form data with image file
- **Returns**: Avatar URL

---

### Analytics APIs

#### `POST /api/analytics/track`
- **Purpose**: Track user analytics events
- **Body**: `{ event, properties }`
- **Returns**: Tracking confirmation

#### `GET /api/analytics/user-stats`
- **Purpose**: Get user trading statistics
- **Returns**: Comprehensive trading stats (win rate, profit factor, etc.)

#### `GET /api/analytics/activity/recent`
- **Purpose**: Get recent user activity
- **Returns**: Array of recent actions/trades

---

### Additional API

#### `GET /api/verify-email`
- **Purpose**: Alternative email verification endpoint with JWT re-issuance
- **Query Parameters**: `token` - Verification token
- **Returns**: Redirects to success/failed page and sets new JWT cookie with updated `email_verified` claim
- **Note**: This endpoint uses a different implementation than `/api/auth/verify-email`. It calls a SQL function `verify_email` and re-issues the JWT token with updated verification status. Use this when you need the JWT token to be automatically refreshed after verification.

---

## Route Organization

The application follows Next.js 13+ App Router conventions:

- **Page Routes**: Defined by `page.tsx` files in route directories
- **API Routes**: Defined by `route.ts` files in `/api` directories
- **Layout**: Each route section has a `layout.tsx` for shared UI
- **Dynamic Routes**: Use `[param]` syntax for dynamic segments (e.g., `/api/mt5/accounts/[id]`)

## Authentication & Authorization

- **Public routes**: `/`, `/about`, `/contact`, `/pricing`, `/privacy`, `/terms`, `/login`, `/signup`
- **Protected routes**: All `/dashboard/*` routes require authentication
- **API authentication**: Most API endpoints require valid JWT token or session cookie
- **Role-based access**: Some features are restricted by subscription plan (Free, Pro, Plus, Elite)

## Key Features by Route

- **Trade Management**: Import CSV/XLSX, manual entry, MT5 sync
- **Analytics**: Interactive charts, performance metrics, risk analysis
- **AI Coach**: Text chat and voice feedback on trading performance
- **Journal**: Tag trades, add notes, export reports
- **Subscription**: Upgrade plans, payment via Flutterwave
- **Security**: HTTPS, encrypted data storage in Supabase, secure authentication

---

*This documentation is current as of the application's latest version. For development details, see the main README.md.*
