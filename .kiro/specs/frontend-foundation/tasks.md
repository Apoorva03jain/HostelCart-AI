# Implementation Plan: Frontend Foundation

## Overview

Set up the complete frontend scaffolding for HostelCart using Vite + React in the `client/` directory. This includes project initialization, Tailwind CSS configuration, React Router v6, folder structure, Axios service layer, context providers (Auth & Group), ProtectedRoute, layout components, shared UI components, and placeholder page scaffolds. No business logic or live API connections — stubs only.

## Tasks

- [ ] 1. Initialize Vite React project and configure tooling
  - [ ] 1.1 Create Vite React project in client/ directory
    - Run `npm create vite@latest client -- --template react` from the project root
    - Install dependencies: `react-router-dom`, `axios`, `tailwindcss`, `@tailwindcss/forms`, `@tailwindcss/vite`
    - Install dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `fast-check`, `msw`
    - Verify dev server starts with `npm run dev`
    - _Requirements: Vite React project, dependency installation_

  - [ ] 1.2 Configure Tailwind CSS
    - Install and configure Tailwind CSS v4 with the Vite plugin (`@tailwindcss/vite`)
    - Update `src/index.css` with `@import "tailwindcss"` directive
    - Add `@plugin "@tailwindcss/forms"` for form styling
    - Verify Tailwind utility classes render correctly
    - _Requirements: Mobile-first Tailwind CSS styling_

  - [ ] 1.3 Configure environment variables
    - Create `client/.env` with `VITE_API_URL=http://localhost:5000`
    - Create `client/.env.example` as a template (without secrets)
    - _Requirements: Environment-based API URL configuration_

  - [ ] 1.4 Configure Vitest for unit testing
    - Add vitest config in `vite.config.js` (test environment: jsdom)
    - Add test script to `package.json`: `"test": "vitest --run"`
    - Create a sample test to verify setup works
    - _Requirements: Testing framework setup_

- [ ] 2. Create folder structure and utility modules
  - [ ] 2.1 Create full folder structure
    - Create directories: `src/components/layout`, `src/components/shared`, `src/components/features`, `src/pages`, `src/services`, `src/contexts`, `src/hooks`, `src/utils`
    - Add placeholder `index.js` barrel files where appropriate
    - _Requirements: Organized project structure per design_

  - [ ] 2.2 Create utility modules (constants, formatters, validators)
    - `src/utils/constants.js` — export `TOKEN_KEY = "hostelcart_token"`, route paths, status values
    - `src/utils/formatters.js` — export `formatCurrency`, `formatDate` stub functions
    - `src/utils/validators.js` — export `isValidEmail`, `isValidPassword` stub functions
    - _Requirements: Centralized constants and utility helpers_

- [ ] 3. Configure Axios service layer
  - [ ] 3.1 Create API service with interceptors
    - Create `src/services/api.js`
    - Create Axios instance with `baseURL` from `import.meta.env.VITE_API_URL`
    - Add request interceptor: read token from `localStorage.getItem("hostelcart_token")` and attach to `config.headers.Authorization` (raw, no Bearer prefix)
    - Add response interceptor: on 401 → remove token from localStorage, redirect to `/login`
    - Export the configured Axios instance as default
    - _Requirements: JWT token handling, automatic 401 logout, raw token in Authorization header_

  - [ ]* 3.2 Write unit tests for API interceptors
    - Test that request interceptor attaches token when present in localStorage
    - Test that request interceptor does not set header when no token
    - Test that 401 response clears token and redirects
    - _Requirements: API layer reliability_

- [ ] 4. Create context providers
  - [ ] 4.1 Create AuthContext with stub methods
    - Create `src/contexts/AuthContext.jsx`
    - Implement AuthProvider with state: `{ user, token, isAuthenticated, isLoading }`
    - Implement `login(email, password)` stub — stores token in localStorage, sets user placeholder
    - Implement `logout()` — removes token from localStorage, resets state
    - Implement `restoreSession()` — reads token from localStorage, sets isLoading false (stub, no real API call)
    - Call `restoreSession()` on mount via useEffect
    - Export `AuthContext` and `AuthProvider`
    - _Requirements: Authentication state management, token persistence, login/logout stubs_

  - [ ] 4.2 Create useAuth custom hook
    - Create `src/hooks/useAuth.js`
    - Wraps `useContext(AuthContext)` with error if used outside provider
    - _Requirements: Clean context consumption pattern_

  - [ ] 4.3 Create GroupContext with stub methods
    - Create `src/contexts/GroupContext.jsx`
    - Implement GroupProvider with state: `{ activeGroup, summary, isLeader, isLoading }`
    - Implement `fetchGroup(groupId)` stub — sets placeholder group
    - Implement `refreshGroup()` stub
    - Implement `clearGroup()` — resets state
    - Export `GroupContext` and `GroupProvider`
    - _Requirements: Active group state management stubs_

  - [ ] 4.4 Create useGroup custom hook
    - Create `src/hooks/useGroup.js`
    - Wraps `useContext(GroupContext)` with error if used outside provider
    - _Requirements: Clean context consumption pattern_

  - [ ]* 4.5 Write unit tests for AuthContext
    - Test initial state (isLoading: true, isAuthenticated: false)
    - Test login sets token and user
    - Test logout clears state and localStorage
    - _Requirements: Auth state correctness_

- [ ] 5. Checkpoint - Verify project foundation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Create routing and ProtectedRoute
  - [ ] 6.1 Create ProtectedRoute component
    - Create `src/components/layout/ProtectedRoute.jsx`
    - Read auth state from `useAuth()`
    - If `isLoading` → render Spinner
    - If `!isAuthenticated` → `<Navigate to="/login" state={{ from: location }} />`
    - Otherwise → render children
    - _Requirements: Route guarding, redirect with return URL_

  - [ ] 6.2 Configure React Router in App.jsx
    - Set up `BrowserRouter` in `src/main.jsx` wrapping `<App />`
    - In `src/App.jsx`: wrap with `AuthProvider` and `GroupProvider`
    - Define routes: `/login`, `/signup` (public), `/dashboard`, `/groups/create`, `/groups/:id`, `/groups/:id/cart`, `/groups/:id/leader` (protected via ProtectedRoute)
    - Add redirect from `/` to `/dashboard`
    - Wrap protected routes with `<Layout>` component
    - _Requirements: Route structure per design, auth-guarded pages_

  - [ ]* 6.3 Write unit tests for ProtectedRoute
    - Test renders children when authenticated
    - Test redirects to /login when not authenticated
    - Test shows spinner while loading
    - _Requirements: Route guard correctness_

- [ ] 7. Create Layout components
  - [ ] 7.1 Create Layout wrapper component
    - Create `src/components/layout/Layout.jsx`
    - Structure: `min-h-screen bg-gray-50` container with Navbar at top and `<main>` with padding
    - Render `{children}` inside main content area
    - _Requirements: Consistent page layout wrapper_

  - [ ] 7.2 Create Navbar component
    - Create `src/components/layout/Navbar.jsx`
    - Display app name/branding "HostelCart"
    - Show user name from `useAuth()` (or placeholder)
    - Navigation links: Dashboard, Create Group
    - Logout button calling `logout()` from auth context
    - Mobile hamburger menu toggle (hidden on md+, visible on mobile)
    - Responsive: `hidden md:flex` for desktop links, `md:hidden` for hamburger
    - _Requirements: Top navigation, mobile-first responsive nav_

  - [ ] 7.3 Create Footer component
    - Create `src/components/layout/Footer.jsx`
    - Simple footer with copyright text and app name
    - Responsive padding, centered text
    - _Requirements: Page footer_

- [ ] 8. Create shared UI components
  - [ ] 8.1 Create Button component
    - Create `src/components/shared/Button.jsx`
    - Props: `children`, `variant` (primary/secondary/danger), `size` (sm/md/lg), `disabled`, `loading`, `onClick`, `type`, `className`
    - Tailwind classes for each variant with hover/focus states
    - Show Spinner when loading, disabled state styling
    - _Requirements: Reusable button with variants_

  - [ ] 8.2 Create Card component
    - Create `src/components/shared/Card.jsx`
    - Props: `children`, `title`, `className`
    - White background, rounded corners, shadow, padding
    - Optional title rendered as heading
    - _Requirements: Reusable card container_

  - [ ] 8.3 Create Input component
    - Create `src/components/shared/Input.jsx`
    - Props: `label`, `name`, `type`, `value`, `onChange`, `placeholder`, `error`, `required`, `disabled`
    - Label above input, error message below in red
    - Tailwind form styling via @tailwindcss/forms
    - _Requirements: Reusable form input with error display_

  - [ ] 8.4 Create Modal component
    - Create `src/components/shared/Modal.jsx`
    - Props: `isOpen`, `onClose`, `title`, `children`
    - Overlay backdrop with centered modal panel
    - Close on backdrop click and close button
    - Accessible: role="dialog", aria-modal, focus trap basics
    - _Requirements: Reusable modal dialog_

  - [ ] 8.5 Create Badge, Spinner, Alert, and ProgressBar components
    - `src/components/shared/Badge.jsx` — Props: `children`, `variant` (success/warning/danger/info). Inline pill-shaped badge.
    - `src/components/shared/Spinner.jsx` — Props: `size` (sm/md/lg). Animated Tailwind spinner.
    - `src/components/shared/Alert.jsx` — Props: `type` (success/error/warning/info), `message`, `onClose`. Dismissible alert banner.
    - `src/components/shared/ProgressBar.jsx` — Props: `value`, `max`, `label`. Horizontal progress bar with percentage.
    - _Requirements: Shared UI primitives for consistent UX_

- [ ] 9. Checkpoint - Verify shared components render
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create page scaffolds
  - [ ] 10.1 Create LoginPage scaffold
    - Create `src/pages/LoginPage.jsx`
    - Form with email and password inputs using shared Input component
    - Login button using shared Button component
    - Link to /signup
    - Placeholder submit handler (logs to console or calls auth stub)
    - Centered card layout: `w-full max-w-md mx-auto`
    - _Requirements: Login page UI scaffold_

  - [ ] 10.2 Create SignupPage scaffold
    - Create `src/pages/SignupPage.jsx`
    - Form with name, email, password, hostelName, roomNumber inputs
    - Signup button using shared Button component
    - Link to /login
    - Placeholder submit handler
    - Centered card layout
    - _Requirements: Signup page UI scaffold_

  - [ ] 10.3 Create DashboardPage scaffold
    - Create `src/pages/DashboardPage.jsx`
    - Heading "My Groups"
    - Placeholder group cards grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
    - "Create Group" button linking to /groups/create
    - Empty state message when no groups
    - _Requirements: Dashboard page UI scaffold_

  - [ ] 10.4 Create CreateGroupPage scaffold
    - Create `src/pages/CreateGroupPage.jsx`
    - Form with storeName, hostelName, closingTime, deliveryThreshold, closeMode (TIME/TARGET) inputs
    - Create Group button
    - Placeholder submit handler
    - Centered card layout
    - _Requirements: Create group page UI scaffold_

  - [ ] 10.5 Create GroupDetailsPage scaffold
    - Create `src/pages/GroupDetailsPage.jsx`
    - Read `groupId` from `useParams()`
    - Display placeholder group info (store name, status, member count)
    - Member list placeholder
    - "Go to Cart" button linking to `/groups/:id/cart`
    - "Leader Dashboard" button (conditionally shown) linking to `/groups/:id/leader`
    - Progress bar showing threshold progress
    - _Requirements: Group details page UI scaffold_

  - [ ] 10.6 Create CartPage scaffold
    - Create `src/pages/CartPage.jsx`
    - Read `id` from `useParams()`
    - Placeholder cart items list
    - "Add Item" form placeholder (productName, quantity, price)
    - Cart total display
    - "Mark as Paid" button placeholder
    - Locked state placeholder (disabled controls)
    - _Requirements: Cart page UI scaffold_

  - [ ] 10.7 Create LeaderDashboardPage scaffold
    - Create `src/pages/LeaderDashboardPage.jsx`
    - Read `id` from `useParams()`
    - Placeholder payment table (member names, paid status, verify buttons)
    - Fee editor section (delivery fee, handling fee, platform fee inputs)
    - "Close Group" button placeholder
    - Shopping list section placeholder
    - Summary section placeholder
    - _Requirements: Leader dashboard page UI scaffold_

- [ ] 11. Final wiring and cleanup
  - [ ] 11.1 Create barrel exports for components
    - Add `src/components/shared/index.js` exporting all shared components
    - Add `src/components/layout/index.js` exporting Layout, Navbar, Footer, ProtectedRoute
    - Add `src/pages/index.js` exporting all page components
    - Add `src/hooks/index.js` exporting useAuth, useGroup
    - _Requirements: Clean import paths_

  - [ ] 11.2 Verify full app renders with routing
    - Ensure App.jsx imports and wires all providers, router, and pages correctly
    - Confirm navigation between public and protected routes works
    - Confirm ProtectedRoute redirects unauthenticated users
    - Remove Vite boilerplate (default App.css content, logo, counter example)
    - _Requirements: End-to-end scaffolding verification_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All page components render placeholder/stub content only — no real API calls
- Context stubs simulate state without backend connectivity
- The Axios service layer is configured but will not be invoked by pages in this phase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "4.1", "4.3"] },
    { "id": 5, "tasks": ["4.2", "4.4", "4.5"] },
    { "id": 6, "tasks": ["6.1", "7.1", "7.2", "7.3"] },
    { "id": 7, "tasks": ["6.2", "6.3"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 9, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7"] },
    { "id": 10, "tasks": ["11.1", "11.2"] }
  ]
}
```
