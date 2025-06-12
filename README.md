# SolidJS + Tanstack Router + Better Auth + Cloudflare + Vite

This template should help get you started developing with SolidJS and TypeScript in Vite.

The template uses [Vite](https://vitejs.dev/), [Solid-js](https://www.solidjs.com/), [Tanstack Solid Router](https://tanstack.com/router/v1/docs/adapters/solid-router), [Better-auth](https://better-auth.dev/), and [Cloudflare](https://www.cloudflare.com/).

## Getting Started

# SolidJS & Cloudflare Full-Stack Template

A comprehensive template for building modern web applications using SolidJS on the frontend and a Cloudflare-powered backend. This template integrates Better Auth for authentication, Cloudflare D1 for database storage, Cloudflare Workers for serverless APIs, Cloudflare Pages for hosting, and Cloudflare KV for session management.

## 🌟 Core Features

### 🔐 **Robust Authentication**
- **Better Auth Integration**: Secure authentication system with support for Google OAuth and email/password.
- **Cloudflare D1**: Stores user and authentication data.
- **Cloudflare KV**: Used for fast session validation at the edge.

### 🏗️ **Modern Architecture**
- **SolidJS Frontend**: Reactive UI with TanStack Router for file-based routing and TanStack Query for server state management.
- **Hono.js API**: Lightweight, fast API layer running on Cloudflare Workers.
- **Cloudflare Stack**: Leverages Cloudflare D1, KV, Workers, and Pages for a scalable and performant infrastructure.

## 🚀 Technical Implementation

### **Database Architecture**
This project uses a Cloudflare-centric database strategy:

- **Cloudflare D1** (SQLite): Centralized storage for authentication data (users, accounts, etc.) and application data.
- **Cloudflare KV**: Utilized for session storage, enabling fast edge validation of user sessions.

## 🛠 Tech Stack

### **Backend**
- **Hono.js**: Fast, lightweight API framework running on Cloudflare Workers.
- **Better Auth**: Authentication system utilizing Cloudflare D1 for user data storage.
- **Cloudflare D1**: Primary database for application and authentication data.
- **Cloudflare KV**: Key-value store for session management.

### **Frontend**
- **SolidJS**: Reactive UI framework.
- **TanStack Router**: File-based routing with loaders and type safety.
- **TanStack Query**: Server state management with features like optimistic updates.
- **TailwindCSS + solid-ui (shadcn for solidjs)**: Modern, accessible component library.

### **Infrastructure**
- **Cloudflare Workers**: Serverless API deployment.
- **Cloudflare Pages**: Frontend hosting and deployment.
- **Cloudflare D1**: SQL database for persistent data storage.
- **Cloudflare KV**: Edge key-value storage.

## 📁 Project Structure

## Database Migrations (D1)

To apply schema changes to the remote Cloudflare D1 database, we use migrations.

### Workflow for DB Changes

1.  **Create a New Migration File**:
    -   In the `migrations` directory, create a new SQL file.
    -   The filename must start with a number that is higher than the previous one (e.g., `migrations/0001_add_new_field.sql`).

2.  **Add SQL Commands**:
    -   In the new file, write the `ALTER TABLE`, `CREATE TABLE`, or other SQL commands needed for the change.
    -   Example: `ALTER TABLE "user" ADD COLUMN bio TEXT;`

3.  **Apply the Migration**:
    -   Run the following command in your terminal. Wrangler is smart enough to only apply new, unapplied migrations.
    -   `wrangler d1 migrations apply <YOUR_DB_NAME> --remote`
