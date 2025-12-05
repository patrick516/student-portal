# Student Portal – School Management System

A modern, role-based school management system for managing:

- Students & classes
- Teachers & form teachers
- Attendance
- Fees & debtors (per term)
- Exams, marks & results
- Guardians & notifications

Built with:

- **Frontend**: React + Vite + TypeScript + Tailwind + Shadcn UI
- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Auth**: JWT (with first-time Headteacher registration)
- **Mail**: SMTP via nodemailer (ready to switch to Resend later)

---

## Project Structure

```text
student-portal/
  backend/
    app/
      controllers/
      middlewares/
      routes/
      services/
    prisma/
      schema.prisma
    .env
    index.js
    package.json

  frontend/
    src/
      api/
        client.ts
      app/
        auth/
        teachers/
        students/
        fees/
        reports/
        ...
      components/
      main.tsx
    .env
    package.json
```

Key Concepts & Roles
Roles

Head Teacher (admin)

First user in the system

Manages users, classes, terms, fee settings, exams, and has full access.

Teacher

Sees only teacher-related parts: My Subjects, Attendance, Enter Marks.

Some teachers can be assigned as Form Teachers for specific classes.

Form Teacher (role = teacher + extra responsibility)

Configures grade scheme for their class.

Views class results, pass rates, and rankings.

Key Concepts & Roles
Roles

Head Teacher (admin)

First user in the system

Manages users, classes, terms, fee settings, exams, and has full access.

Teacher

Sees only teacher-related parts: My Subjects, Attendance, Enter Marks.

Some teachers can be assigned as Form Teachers for specific classes.

Form Teacher (role = teacher + extra responsibility)

Configures grade scheme for their class.

Views class results, pass rates, and rankings.

Bursar

Manages fees: required fee per term & class, invoices, payments.

Views debtors per term & class.

Viewer

Read-only access (useful for inspectors / senior staff).

Headteacher Registration

First-time setup: When the system has no users, a special Headteacher registration flow is used.

Once the Headteacher is created:

/api/auth/can-register-first returns { allowed: false }.

Registration route is disabled to everyone else.

Headteacher creates teachers, bursar, viewer accounts from the UI.
Bursar

Manages fees: required fee per term & class, invoices, payments.

Views debtors per term & class.

Viewer

Read-only access (useful for inspectors / senior staff).

Headteacher Registration

First-time setup: When the system has no users, a special Headteacher registration flow is used.

Once the Headteacher is created:

/api/auth/can-register-first returns { allowed: false }.

Registration route is disabled to everyone else.

Headteacher creates teachers, bursar, viewer accounts from the UI.

cd backend
npm install

2. Configure .env

Create backend/.env (or update it) with something like:
PORT=3001

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/student_portal?schema=public"

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN="7d"

BRAND_NAME="Student Portal"
BRAND_SCHOOL="Your School Name"
BRAND_LOGO_URL="https://your.cdn/logo.png"
SUPPORT_EMAIL="support@yourschool.org"
FRONTEND_BASE_URL="http://localhost:5173"

# Mail provider: smtp (local/dev) or resend (later)

MAIL_PROVIDER=smtp

# SMTP config (for nodemailer)

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM="Student Portal <no-reply@example.com>"

# Resend (optional for future)

RESEND_API_KEY=
MAIL_FROM_EMAIL=
MAIL_FROM_NAME=
