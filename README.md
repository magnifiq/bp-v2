# Backend system for GenFlow

## Overview

It is a backend application built with Node.js, Express, and MongoDB. It provides APIs for managing users, organizations, tools, and runs, with robust authentication and authorization mechanisms. The project is written in TypeScript for type safety and maintainability.

---

## Features

- **Authentication & Authorization**: Secure user authentication using JWT and role-based access control.
- **Organization Management**: APIs for creating, updating, and managing organizations.
- **User Management**: CRUD operations for users with validation and error handling.
- **Tool Management**: APIs for managing tools and their configurations.
- **Run Management**: Track and manage runs with associated files and stages.
- **Database**: MongoDB integration with Mongoose for schema-based data modeling.

---

## Prerequisites

Ensure you have the following installed:

- **Node.js**: [Download Node.js](https://nodejs.org/)
- **Docker** (optional, for containerized setup): [Install Docker](https://docs.docker.com/get-docker/)
- **MongoDB**: [Install MongoDB](https://www.mongodb.com/try/download/community)

---

## Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd bp-v2
   ```
2. **Install dependancies**

```bash
    cd BE
    npm install
```

3. **Add values to the .env.sample file**

```bash
MONGO_URI=             # Pripojenie k MongoDB pre lokalny vyvoj
MONGO_URI_DOCKER=      # Pripojenie k MongoDB pre Docker
JWT_SECRET=            # Tajny kluc na podpis JWT
JWT_EXPIRATION=        # Trvanie platnosti tokenu JWT
PORT=                  # Port, na ktorom bude server bezat
EMAIL_USER=            # E-mailova adresa na odosielanie e-mailov
EMAIL_PASS=            # Heslo odosielatela e-mailu
NODE_ENV=production    # Prostredie aplikacie (vyvojove alebo produkcne)
PROD_URL=              # Zakladna URL adresa nasadenej aplikacie
GMAIL_PASS=            # Heslo Gmail (pouzite na testovanie Nodemaileru)
```

4. **Run the Application**

   - For development:

     ```bash
     npm run dev
     ```

   - For production:
     ```bash
     npm run build
     node dist/server.js
     ```

5. **Run unit tests**

```bash
    npm run test
```

## Running with Docker

1. **Build and start containers**

   ```bash
   docker-compose up --build
   ```

2. **Stop containers**

   ```bash
   docker-compose down
   ```
