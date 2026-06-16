# Requirements Document

## Introduction

This feature adds leader-only authorization to HostelCart AI. Certain privileged actions within a group (closing the group, verifying member payments, and updating delivery/handling/platform fees) must be restricted so that only the group leader can perform them. The system uses the existing JWT authentication middleware to identify the requester and compares their identity against the group's `groupLeader` field. Non-leader members who attempt these actions receive a clear denial message.

## Glossary

- **Auth_Middleware**: The existing Express middleware at `server/middleware/auth.js` that validates JWT tokens and attaches decoded user identity (userId, email) to `req.user`
- **Leader_Authorization_Middleware**: A new middleware/helper function that verifies the authenticated user is the group leader for the target group
- **Group_Leader**: The user whose email matches the `groupLeader` field stored in the Group document
- **Protected_Endpoint**: An API endpoint that requires the requester to be the group leader
- **Group_Model**: The Mongoose model representing a group, containing `groupLeader`, `members`, fees, and status fields
- **Authenticated_User**: A user whose JWT token has been successfully validated by Auth_Middleware, providing `userId` and `email` on `req.user`

## Requirements

### Requirement 1: Leader Identity Resolution via JWT

**User Story:** As a system administrator, I want the system to determine the group leader based on the JWT token identity, so that authorization cannot be spoofed by manipulating frontend request data.

#### Acceptance Criteria

1. WHEN a request reaches a Protected_Endpoint, THE Leader_Authorization_Middleware SHALL extract the user identity from `req.user` (set by Auth_Middleware) instead of from the request body or query parameters
2. WHEN a request reaches a Protected_Endpoint, THE Leader_Authorization_Middleware SHALL identify the target Group_Model document using the `groupId` route parameter (`req.params.groupId`) and perform a case-insensitive comparison of the Authenticated_User's email from `req.user.email` against the `groupLeader` field of that document
3. WHEN the Authenticated_User's email matches the `groupLeader` field (case-insensitive), THE Leader_Authorization_Middleware SHALL allow the request to proceed to the route handler
4. WHEN the Authenticated_User's email does not match the `groupLeader` field, THE Leader_Authorization_Middleware SHALL respond with HTTP status 403 and the JSON body `{ "message": "Only group leader can perform this action" }`
5. IF the Group_Model document identified by the `groupId` route parameter does not exist, THEN THE Leader_Authorization_Middleware SHALL respond with HTTP status 404 and a JSON body containing a message indicating the group was not found
6. IF `req.user` is not present on the request (Auth_Middleware was not applied or failed to attach user data), THEN THE Leader_Authorization_Middleware SHALL respond with HTTP status 401 and a JSON body containing a message indicating authentication is required

### Requirement 2: Protect Group Closing Endpoint

**User Story:** As a group leader, I want only me to be able to close the group, so that members cannot prematurely or maliciously close the group order.

#### Acceptance Criteria

1. WHEN a POST request is made to `/groups/:groupId/close` without a valid JWT token in the Authorization header, THE Auth_Middleware SHALL reject the request with HTTP 401 and a message indicating access is denied or the token is invalid
2. WHEN a POST request is made to `/groups/:groupId/close` with a valid JWT token, THE Leader_Authorization_Middleware SHALL verify that the authenticated user's email matches the group's groupLeader field
3. IF the authenticated user's email does not match the group's groupLeader field, THEN THE Leader_Authorization_Middleware SHALL reject the request with HTTP 403 and a message indicating only the group leader can perform this action
4. WHEN the Group_Leader sends a POST request to `/groups/:groupId/close` and the group exists and is not already closed, THE system SHALL set the group's isClosed field to true and return HTTP 200 with a message indicating the group was closed successfully
5. IF a POST request is made to `/groups/:groupId/close` and the specified groupId does not correspond to an existing group, THEN THE system SHALL return HTTP 404 with a message indicating the group was not found
6. IF the Group_Leader sends a POST request to `/groups/:groupId/close` and the group is already closed, THEN THE system SHALL return HTTP 400 with a message indicating the group is already closed

### Requirement 3: Protect Payment Verification Endpoint

**User Story:** As a group leader, I want only me to be able to verify member payments, so that payment confirmations are trustworthy and controlled.

#### Acceptance Criteria

1. WHEN a POST request is made to `/groups/:groupId/verify-payment`, THE system SHALL require valid JWT authentication via Auth_Middleware before processing
2. WHEN a POST request is made to `/groups/:groupId/verify-payment`, THE Leader_Authorization_Middleware SHALL verify the Authenticated_User is the Group_Leader of the specified group
3. WHEN a non-leader member sends a POST request to `/groups/:groupId/verify-payment`, THE Leader_Authorization_Middleware SHALL reject the request with HTTP 403 and `{ "message": "Only group leader can perform this action" }`
4. WHEN the Group_Leader sends a POST request to `/groups/:groupId/verify-payment` with a request body containing the target member's `email`, THE system SHALL set `paymentVerified` to `true` for the matching member in the group's members array and return HTTP 200 with a success message
5. IF the Group_Leader sends a verify-payment request and no member with the specified `email` exists in the group's members array, THEN THE system SHALL reject the request with HTTP 404 and a message indicating the member was not found
6. IF the Group_Leader sends a verify-payment request and the specified `groupId` does not match any existing group, THEN THE system SHALL reject the request with HTTP 404 and a message indicating the group was not found

### Requirement 4: Protect Fee Update Operations

**User Story:** As a group leader, I want only me to be able to update delivery, handling, and platform fees, so that financial parameters are controlled by the responsible party.

#### Acceptance Criteria

1. WHEN a request is made to update delivery, handling, or platform fees on a group, THE system SHALL require valid JWT authentication via Auth_Middleware before processing
2. WHEN a request is made to update fees, THE Leader_Authorization_Middleware SHALL verify the Authenticated_User is the Group_Leader of the specified group
3. WHEN a non-leader member sends a request to update fees, THE Leader_Authorization_Middleware SHALL reject the request with HTTP 403 and `{ "message": "Only group leader can perform this action" }`
4. WHEN the Group_Leader sends a valid request to update fees, THE system SHALL update only the specified fee fields (deliveryFee, handlingFee, platformFee) present in the request body and return the updated group object with HTTP 200
5. IF any provided fee value is not a number or falls outside the range of 0 to 99999, THEN THE system SHALL reject the entire request with HTTP 400 and an error message indicating which field failed validation
6. IF the request body contains none of the recognized fee fields (deliveryFee, handlingFee, platformFee), THEN THE system SHALL reject the request with HTTP 400 and an error message indicating that at least one fee field is required

### Requirement 5: Middleware Modularity and Reusability

**User Story:** As a developer, I want the leader authorization logic to be a reusable middleware function, so that it can be applied to any future leader-only endpoint without code duplication.

#### Acceptance Criteria

1. THE Leader_Authorization_Middleware SHALL be implemented as a separate, exportable middleware function in the `server/middleware` directory that follows the Express middleware signature `(req, res, next) => {}`
2. THE Leader_Authorization_Middleware SHALL read the group identifier from the route parameter `groupId` or `id` (checking `req.params.groupId` first, then `req.params.id`) without requiring the route handler to pre-fetch the group
3. THE Leader_Authorization_Middleware SHALL be chainable with Auth_Middleware, applied as `[auth, leaderAuth]` in route definitions, and SHALL rely on `req.user` being populated by the preceding Auth_Middleware to identify the authenticated user
4. IF the group specified by the route parameter does not exist, THEN THE Leader_Authorization_Middleware SHALL respond with HTTP status 404 and `{ "message": "Group not found" }`
5. IF the authenticated user's email (`req.user.email`) does not match the group's `groupLeader` field, THEN THE Leader_Authorization_Middleware SHALL respond with HTTP status 403 and a JSON body containing a message indicating the user is not authorized as the group leader
6. IF the route parameter value is not a valid MongoDB ObjectId format, THEN THE Leader_Authorization_Middleware SHALL respond with HTTP status 400 and a JSON body containing a message indicating an invalid group identifier
7. WHEN the authenticated user's email matches the group's `groupLeader` field, THE Leader_Authorization_Middleware SHALL call `next()` to pass control to the subsequent route handler

### Requirement 6: Preserve Existing System Behavior

**User Story:** As a developer, I want the authorization changes to be additive without modifying the existing database schema or breaking existing unauthenticated endpoints, so that the system remains stable.

#### Acceptance Criteria

1. THE system SHALL preserve all existing fields of the Group_Model schema (storeName, groupLeader, hostelName, closingTime, deliveryFee, deliveryThreshold, handlingFee, platformFee, closeMode, isClosed, status, members array with its nested fields) without removing, renaming, or changing the type of any existing field
2. THE system SHALL preserve the existing Auth_Middleware request interface such that it continues to read the token from the Authorization header, return HTTP 401 with a message for missing or invalid tokens, and attach the decoded JWT payload to req.user before calling next()
3. WHEN Auth_Middleware is added to a previously unprotected endpoint and a request includes a valid JWT token from an authorized user, THE system SHALL return the same HTTP status code and the same JSON response body structure as the endpoint returned before the middleware was added
4. THE system SHALL continue to serve the following endpoints without requiring authentication middleware: GET /groups, POST /groups/:id/join, POST /groups/:groupId/cart, POST /groups/:groupId/pay, and GET /groups/:groupId/summary
5. IF a new field is added to the Group_Model schema to support authorization, THEN THE system SHALL add it as an optional field with a default value so that existing documents remain valid without migration
