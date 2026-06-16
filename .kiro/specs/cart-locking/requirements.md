# Requirements Document

## Introduction

This document defines the requirements for the Cart Locking feature. Cart locking prevents members from modifying their cart (add, edit, remove) once their payment has been verified by the group leader. The implementation centralizes the payment-verification check in a reusable `cartLock` middleware and introduces three new dedicated cart endpoints while preserving backward compatibility with the existing cart endpoint.

## Glossary

- **Cart_Lock_Middleware**: An Express middleware (`cartLock`) that intercepts cart-mutating requests and blocks them if the member's payment has been verified.
- **Member**: A user who has joined a group, identified by their email in the group's `members` array.
- **Payment_Verified**: A boolean flag (`paymentVerified`) on the member sub-document indicating the group leader has confirmed the member's payment.
- **Cart_Items**: An array of product entries within a member's sub-document, each containing productName, productLink, quantity, price, and itemTotal.
- **Total_Amount**: A numeric field on the member sub-document representing the sum of all cart item totals.
- **Group**: A MongoDB document representing a shared order group, containing members and their carts.
- **Auth_Middleware**: The existing `auth` middleware that verifies a JWT token and attaches `req.user` (with userId and email) to the request.
- **Route_Handler**: The Express handler function that executes the cart add, edit, or remove business logic.

## Requirements

### Requirement 1: Cart Lock Enforcement

**User Story:** As a group leader, I want members' carts to be locked after I verify their payment, so that the order contents cannot change after payment confirmation.

#### Acceptance Criteria

1. WHEN a cart-mutating request is received for a member whose paymentVerified field is true, THE Cart_Lock_Middleware SHALL return a 403 status with the message "Cart locked after payment verification"
2. WHEN a cart-mutating request is received for a member whose paymentVerified field is false, THE Cart_Lock_Middleware SHALL allow the request to proceed to the Route_Handler
3. THE Cart_Lock_Middleware SHALL perform zero write operations to the database during execution
4. WHEN the Cart_Lock_Middleware allows a request to proceed, THE Cart_Lock_Middleware SHALL attach the group document to req.group and the member sub-document to req.member

### Requirement 2: Authentication Prerequisite

**User Story:** As a system operator, I want cart operations to require authentication, so that only verified users can modify carts.

#### Acceptance Criteria

1. WHEN a request to a cart-mutating endpoint lacks a valid JWT token, THE Auth_Middleware SHALL return a 401 status before the Cart_Lock_Middleware executes
2. THE Cart_Lock_Middleware SHALL identify the member using the email from the verified JWT token (req.user.email), not from the request body
3. IF req.user is absent when the Cart_Lock_Middleware executes, THEN THE Cart_Lock_Middleware SHALL return a 401 status with the message "Authentication required"

### Requirement 3: Add Item to Cart

**User Story:** As a group member, I want to add items to my cart through a dedicated endpoint, so that I can build my order within the group.

#### Acceptance Criteria

1. WHEN a valid add-to-cart request is received with productName, quantity, and price, THE Route_Handler SHALL push a new item to the member's Cart_Items with itemTotal calculated as quantity multiplied by price
2. WHEN an item is added to the cart, THE Route_Handler SHALL increase the member's Total_Amount by the new item's itemTotal
3. WHEN the item is successfully added, THE Route_Handler SHALL save the group document and return a 200 status with the message "Item added successfully" and the updated member object

### Requirement 4: Edit Cart Item

**User Story:** As a group member, I want to edit items in my cart, so that I can adjust quantities or correct mistakes before payment.

#### Acceptance Criteria

1. WHEN an edit request is received with a productName that exists in the member's Cart_Items, THE Route_Handler SHALL update the specified fields (quantity, price, productLink) on the matching item
2. WHEN a cart item is edited, THE Route_Handler SHALL recalculate that item's itemTotal as quantity multiplied by price
3. WHEN a cart item is edited, THE Route_Handler SHALL recalculate the member's Total_Amount as the sum of all itemTotal values in Cart_Items
4. IF an edit request specifies a productName that does not exist in the member's Cart_Items, THEN THE Route_Handler SHALL return a 404 status with the message "Item not found in cart"
5. WHEN the item is successfully edited, THE Route_Handler SHALL save the group document and return a 200 status with the message "Item updated successfully" and the updated member object

### Requirement 5: Remove Cart Item

**User Story:** As a group member, I want to remove items from my cart, so that I can take out items I no longer want.

#### Acceptance Criteria

1. WHEN a remove request is received with a productName that exists in the member's Cart_Items, THE Route_Handler SHALL remove the matching item from Cart_Items
2. WHEN a cart item is removed, THE Route_Handler SHALL decrease the member's Total_Amount by the removed item's itemTotal
3. IF a remove request specifies a productName that does not exist in the member's Cart_Items, THEN THE Route_Handler SHALL return a 404 status with the message "Item not found in cart"
4. WHEN the item is successfully removed, THE Route_Handler SHALL save the group document and return a 200 status with the message "Item removed successfully" and the updated member object

### Requirement 6: Total Amount Consistency

**User Story:** As a group member, I want my cart total to always reflect the actual items in my cart, so that I see accurate pricing.

#### Acceptance Criteria

1. AFTER any cart mutation (add, edit, or remove), THE Route_Handler SHALL ensure that Total_Amount equals the sum of all itemTotal values in the member's Cart_Items
2. AFTER any cart mutation, THE Route_Handler SHALL ensure that Total_Amount is greater than or equal to zero

### Requirement 7: Group and Member Validation

**User Story:** As a system operator, I want invalid group or member lookups to return clear errors, so that clients receive actionable feedback.

#### Acceptance Criteria

1. IF the groupId in the request does not match any Group in the database, THEN THE Cart_Lock_Middleware SHALL return a 404 status with the message "Group not found"
2. IF the authenticated user's email does not match any Member in the group, THEN THE Cart_Lock_Middleware SHALL return a 404 status with the message "Member not found"

### Requirement 8: Backward Compatibility

**User Story:** As a developer, I want the existing POST /groups/:groupId/cart endpoint to continue working identically, so that current clients are not broken.

#### Acceptance Criteria

1. THE existing POST /groups/:groupId/cart endpoint SHALL use the Cart_Lock_Middleware instead of its current inline paymentVerified check
2. THE existing POST /groups/:groupId/cart endpoint SHALL maintain the same request body contract (productName, productLink, quantity, price, email)
3. THE existing POST /groups/:groupId/cart endpoint SHALL maintain the same response format and status codes as before the refactoring

### Requirement 9: New Endpoint Registration

**User Story:** As a developer, I want dedicated cart endpoints for add, edit, and remove operations, so that the API follows RESTful conventions.

#### Acceptance Criteria

1. THE system SHALL expose POST /groups/:groupId/cart/add for adding items, protected by Auth_Middleware and Cart_Lock_Middleware
2. THE system SHALL expose PUT /groups/:groupId/cart/edit for editing items, protected by Auth_Middleware and Cart_Lock_Middleware
3. THE system SHALL expose DELETE /groups/:groupId/cart/remove for removing items, protected by Auth_Middleware and Cart_Lock_Middleware
4. THE new cart endpoints SHALL identify the member using the JWT identity (req.user.email) rather than requiring an email field in the request body
