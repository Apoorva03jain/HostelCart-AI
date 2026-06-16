# Implementation Plan: Cart Locking After Payment Verification

## Overview

Implement a centralized `cartLock` middleware that blocks cart mutations for payment-verified members, refactor the existing cart endpoint to use it, and create three new dedicated cart endpoints (add, edit, remove) that use JWT identity and recalculate totals correctly.

## Tasks

- [ ] 1. Create cartLock middleware
  - [ ] 1.1 Create `server/middleware/cartLock.js` with the cartLock middleware
    - Validate `req.user` exists, return 401 if missing
    - Fetch group by `req.params.groupId`, return 404 if not found
    - Find member by `req.user.email`, return 404 if not found
    - Check `member.paymentVerified` — return 403 with "Cart locked after payment verification" if true
    - Attach `req.group` and `req.member` to request, call `next()` if unlocked
    - Perform zero write operations to the database
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 7.1, 7.2_

  - [ ]* 1.2 Write property tests for cartLock middleware
    - **Property 1: Lock Immutability** — For any member with paymentVerified = true, middleware returns 403
    - **Property 2: Unlock Pass-through with Context Attachment** — For any unlocked member, middleware calls next() and attaches req.group and req.member
    - **Property 3: Middleware Read-Only** — For any request, middleware performs zero database writes
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [ ]* 1.3 Write unit tests for cartLock middleware
    - Test 401 when req.user is absent
    - Test 404 when group not found
    - Test 404 when member not found
    - Test 403 when paymentVerified is true
    - Test next() called and req.group/req.member attached when paymentVerified is false
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 7.1, 7.2_

- [ ] 2. Implement POST /groups/:groupId/cart/add endpoint
  - [ ] 2.1 Create the addToCart route handler
    - Use `req.member` and `req.group` from cartLock middleware
    - Extract productName, productLink, quantity, price from request body
    - Calculate itemTotal = quantity * price
    - Push new item to `member.cartItems`
    - Increase `member.totalAmount` by itemTotal
    - Save group document and return 200 with "Item added successfully" and updated member
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2_

  - [ ] 2.2 Register the route in server.js
    - Add `app.post("/groups/:groupId/cart/add", [auth, cartLock], addToCart)`
    - Import cartLock middleware and addToCart handler
    - _Requirements: 9.1, 9.4_

  - [ ]* 2.3 Write property test for addToCart
    - **Property 6: Add Grows Cart** — For any valid add request, cartItems length increases by 1 and new item's itemTotal equals quantity * price
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.4 Write unit tests for addToCart handler
    - Test item is pushed with correct itemTotal calculation
    - Test totalAmount increases correctly
    - Test response format matches spec (200, message, member object)
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Implement PUT /groups/:groupId/cart/edit endpoint
  - [ ] 3.1 Create the editCartItem route handler
    - Use `req.member` and `req.group` from cartLock middleware
    - Find item in `member.cartItems` by productName
    - Return 404 with "Item not found in cart" if item doesn't exist
    - Update provided fields (quantity, price, productLink)
    - Recalculate item's itemTotal = quantity * price
    - Recalculate member.totalAmount as sum of all itemTotal values
    - Save group document and return 200 with "Item updated successfully" and updated member
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_

  - [ ] 3.2 Register the route in server.js
    - Add `app.put("/groups/:groupId/cart/edit", [auth, cartLock], editCartItem)`
    - _Requirements: 9.2, 9.4_

  - [ ]* 3.3 Write property test for editCartItem
    - **Property 4: Total Consistency After Mutation** — After any edit, member.totalAmount equals sum of all itemTotal values
    - **Validates: Requirements 4.2, 4.3, 6.1**

  - [ ]* 3.4 Write unit tests for editCartItem handler
    - Test item fields are updated correctly
    - Test itemTotal recalculated after edit
    - Test totalAmount equals sum of all itemTotals after edit
    - Test 404 response when productName not found
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. Implement DELETE /groups/:groupId/cart/remove endpoint
  - [ ] 4.1 Create the removeFromCart route handler
    - Use `req.member` and `req.group` from cartLock middleware
    - Find item in `member.cartItems` by productName
    - Return 404 with "Item not found in cart" if item doesn't exist
    - Remove item from cartItems array using splice
    - Decrease member.totalAmount by removed item's itemTotal
    - Save group document and return 200 with "Item removed successfully" and updated member
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

  - [ ] 4.2 Register the route in server.js
    - Add `app.delete("/groups/:groupId/cart/remove", [auth, cartLock], removeFromCart)`
    - _Requirements: 9.3, 9.4_

  - [ ]* 4.3 Write property test for removeFromCart
    - **Property 7: Remove Shrinks Cart** — For any valid remove request, cartItems length decreases by 1 and the productName no longer exists in the array
    - **Property 5: Non-Negative Total** — After any remove, member.totalAmount >= 0
    - **Validates: Requirements 5.1, 5.2, 6.2**

  - [ ]* 4.4 Write unit tests for removeFromCart handler
    - Test item is removed from cartItems
    - Test totalAmount decreases by removed item's itemTotal
    - Test 404 response when productName not found
    - Test response format matches spec
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 5. Checkpoint - Core endpoints implemented
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Refactor existing POST /groups/:groupId/cart for backward compatibility
  - [ ] 6.1 Refactor the existing cart endpoint to use cartLock middleware
    - Add `[auth, cartLock]` middleware chain to the existing route
    - Remove inline `Group.findById` and member lookup (use req.group, req.member)
    - Remove inline `paymentVerified` check (handled by cartLock)
    - Keep `req.body.email` in the request body contract for backward compat (but identify member via JWT)
    - Preserve same response format: 200 with `{ message: "Item added successfully", member }`
    - Preserve same error responses (404 for group/member not found)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 6.2 Write integration tests for backward compatibility
    - Test existing endpoint still accepts same request body (productName, productLink, quantity, price, email)
    - Test same response format and status codes
    - Test cart lock returns 403 (not 400 as before) when paymentVerified is true
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 7. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses JavaScript (Node.js/Express) — all implementation tasks use this language
- No schema changes required — existing `paymentVerified` boolean is already present
- The `cartLock` middleware pattern mirrors the existing `leaderAuth` middleware structure

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2"] }
  ]
}
```
