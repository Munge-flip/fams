# FAMS repository instructions

## Project scope

Financial Assistance Management System (FAMS) is a BSIT capstone project for
Surigao del Norte State University. It is a mobile-first portal that lets
students and barangay residents discover financial-aid programs, apply
digitally, and track aid; barangay or school administrators manage programs
and applications.

Before generating project code, read `GEMINI.md` for the full project context.
Do not modify it unless the user explicitly requests that change.

## Required technology and structure

Do not deviate from this stack without explicit user approval:

- Client: React.js with Vite, as a mobile-first single-page application.
- Server: Node.js and Express.js REST API.
- Database: MongoDB with Mongoose.
- Upload storage: Cloudinary through Multer middleware.
- Authentication: JWT in an httpOnly cookie, never localStorage.
- Authorization: RBAC roles `student`, `resident`, and `admin`.
- Notifications: Firebase Cloud Messaging (FCM).
- Styling: Tailwind CSS with mobile-first breakpoints.
- Package manager: npm.

Maintain this layout when the project is scaffolded:

```text
client/
  public/
  src/
    components/ pages/{auth,dashboard,programs,apply,applications,admin}/
    context/ hooks/ services/ utils/
server/
  config/ controllers/ middleware/ models/ routes/ utils/
```

Keep secrets in `.env`; never commit, hardcode, or expose them in client code.

## Data and API contracts

Use the exact field names and enums defined in `GEMINI.md` for the `User`,
`AidProgram`, `Application`, `Document`, and `Notification` Mongoose models.
Do not rename or casually add fields. Preserve the model references, defaults,
and these enums:

- User roles: `student`, `resident`, `admin`.
- AidProgram categories: `scholarship`, `barangay`, `emergency`; status:
  `active`, `closed`.
- Application status: `submitted`, `under_review`, `approved`, `denied`,
  `cash_released`; default `submitted`.
- Document type: `valid_id`, `certificate_of_indigency`, `grades`, `other`.
- Notification type: `status_update`, `new_program`, `action_required`,
  `general`.

Implement the route groups and paths in `GEMINI.md` exactly when their work is
requested: `/api/auth`, `/api/programs`, `/api/applications`,
`/api/documents`, `/api/notifications`, and `/api/admin`.

All API responses use this envelope:

```js
// Success
res.status(200).json({ success: true, data: result })

// Error
res.status(400).json({ success: false, message: 'Error message here' })
```

## Authentication, authorization, and security

- Except for registration, login, and public program listing, require a valid
  JWT. Confirm any route-level exception against the specified API contract.
- Store the JWT in an httpOnly cookie named `fams_token`; its payload is
  `{ id, role, name }`.
- Check `req.user.role` in RBAC middleware. Students and residents may browse,
  apply, track their own status, and receive notifications. Admins also manage
  programs, review applications, and generate reports.
- Validate every request body before processing it, bcrypt-hash passwords, and
  use Mongoose `.populate()` for referenced relational data.
- Limit document uploads to PDF or JPEG files, 5 MB each, and show progress in
  the client.

## Client and coding conventions

- Use functional React components and hooks only; do not use class components.
- Design at 375px mobile width first, then scale up.
- Use high-contrast black and white with minimal color accents and Inter or a
  system sans-serif font.
- Use Tailwind classes; do not use inline styles or separate CSS files unless
  truly necessary.
- Use React Context for authentication and notifications; do not use Redux.
- Put all Axios calls in `client/src/services/`, never directly in components.
- Include clear labels, inline validation, loading states, and error states for
  all forms and relevant React components.
- Use `async`/`await` with `try`/`catch`, not `.then().catch()`. Use `const` or
  `let`, never `var`.
- Use realistic Filipino/local names and barangay names rather than lorem ipsum.
- For student/resident views, provide bottom navigation for Dashboard,
  Applications, and Status.
- Use status colors consistently: submitted gray, under review blue, approved
  green, denied red, and cash released dark green.

## Product priorities

Implement UI work in the priority order specified in `GEMINI.md`: authentication,
dashboard and program discovery first; application workflow and tracking next;
then administrator functions and reports. The application flow is a three-step
wizard: Personal Info, Upload Documents, Review & Submit.

Treat the setup-to-demo schedule and sample seed data in `GEMINI.md` as planning
and demo guidance, not instructions to scaffold, install dependencies, seed, or
run services unless the user asks for those actions.

## Do not automatically enforce unresolved source inconsistencies

`GEMINI.md` contains items that conflict or lack enough detail. Do not silently
invent policy for them; raise the issue when the affected work is requested:

- `GET /api/programs/:id` has no stated access level: the authentication rule
  names only `GET /api/programs` as public, while the route list does not mark
  the single-program endpoint as protected.
- The UI calls for a four-stage progress bar, while the application model has
  five statuses.
- The login screen says email/studentID + password, but the authentication
  endpoint's accepted credential rules are not defined.
- The admin dashboard copy refers to “drivers” and “bookings,” which do not
  belong to FAMS.
- The exact validation rules and authorization ownership checks for several
  non-admin routes are not fully specified.
- The source gives no precise CORS/cookie deployment configuration, token
  signing policy beyond payload/expiry environment variables, or file MIME
  validation details beyond file type and size.
