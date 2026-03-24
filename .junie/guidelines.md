Here is a clean, structured **`AGENT_GUIDELINES.md`** you can use for your AI agent based on your requirements.

---

# 🤖 AI Agent Guidelines – drumdibum

## 1. Purpose of the Agent

The AI agent supports the **drumdibum platform** by assisting with:

* User interactions
* Activity and group management
* Notifications and reminders
* Data consistency and system integrity

The agent must always act in alignment with **user roles, permissions, and system rules**.

---

## 2. Core Domain Concepts

### Entities

* **User**
* **Group**
* **Activity**
* **Invitation**
* **Membership**
* **Notification**

### User Roles

| Role            | Description                |
| --------------- | -------------------------- |
| Anonymous User  | Not logged in              |
| Registered User | Logged in                  |
| Group Member    | Member of a group          |
| Activity Member | Assigned to activity       |
| Group Admin     | Manages group & activities |
| System Admin    | Full system visibility     |

---

## 3. Functional Scope

### 3.1 User Management

* Register users (with AGB consent tracking)
* Login / Logout
* Profile management (incl. avatar)
* Account deletion (full data removal required)
* Membership requests & approvals

### 3.2 Group Management

* Create, update, delete groups
* Invite users (registered & anonymous)
* Manage members (add/remove/roles)
* Handle membership requests
* Track invitation status

### 3.3 Activity Management

* Create, update, delete activities
* Assign members
* Support multiple groups per activity
* Track participation status:

    * Accepted
    * Declined
    * Pending
* Allow scheduling changes
* Prevent duplicate assignments

### 3.4 Invitations & Participation

* Accept / decline invitations
* Token-based group joining
* QR code-based group onboarding
* Waitlist / fallback participants (Phase 2)

### 3.5 Notifications

* Notify users about:

    * New activities
    * Reminders
    * Pending decisions
* Notify admins about:

    * Participation status
    * Missing notifications
* Notifications must be **configurable and delayable**

---

## 4. Non-Functional Requirements

### Performance

* Response time: **≤ 1 second**
* Handle: **≥ 200 concurrent requests**

### Usability

* Mobile-first & responsive design
* Clear loading states (progress indicators)
* Intuitive UX (no training required)

### Security

* Authentication required for protected areas
* Encrypted data transfer (HTTPS mandatory)
* Sensitive data encryption (optional, evaluable)

### Scalability

* Horizontal scaling (add servers/resources)
* Failover without user disruption

### Reliability

* No data loss on failure
* System must remain consistent after crashes

### Extensibility

* Provide **authenticated REST API**
* Support external clients (e.g. mobile apps)

---

## 5. AI Agent Behavioral Rules

### 5.1 Role Awareness

The agent MUST:

* Always check user role before actions
* Never expose unauthorized data
* Enforce permissions strictly

---

### 5.2 Data Integrity

The agent MUST:

* Avoid duplicate assignments
* Ensure consistent state transitions
* Log critical changes (if enabled)

---

### 5.3 Notifications Logic

The agent SHOULD:

* Respect delayed notification settings
* Avoid premature notifications
* Trigger reminders at correct times

---

### 5.4 User Experience

The agent MUST:

* Provide clear feedback (success, error, loading)
* Guide users through flows (e.g. invitations)
* Support multilingual output (future-ready)

---

### 5.5 Privacy & Compliance

The agent MUST:

* Track AGB consent with timestamp
* Ensure full data deletion on account termination
* Avoid unnecessary tracking (e.g. location unless approved)

---

## 6. Phases & Feature Awareness

### Phase 1 (Core)

* Registration & authentication
* Group & activity management
* Invitations & participation
* Basic notifications
* Member & role management

### Phase 2 (Advanced)

* Reminders & escalation notifications
* API access for external systems
* Multi-language support
* Activity waitlists
* Outlook/calendar integration
* Audit logs & tracking
* Admin visibility extensions

---

## 7. API Guidelines (for Agent Interaction)

* All API calls must be **authenticated**
* Use REST principles
* Validate all inputs
* Return consistent response structures

---

## 8. Error Handling

The agent MUST:

* Fail gracefully
* Provide meaningful error messages
* Never expose internal system details
* Suggest next steps when possible

---

## 9. Testing Expectations

* Unit tests for core logic
* Integration tests for workflows
* Load testing (200 concurrent users)
* Usability testing with diverse users

---

## 10. Operational Constraints

* Target uptime: **≥ 99%**
* System must support **24/7 availability**
* Monitoring and alerting should be in place

---

## 11. Key Use Cases (UC Overview)

| UC ID | Description               |
| ----- | ------------------------- |
| UC01  | Register                  |
| UC02  | Login/Logout              |
| UC03  | Group management          |
| UC04  | Invite to group           |
| UC05  | Accept/decline invitation |
| UC06  | Activity management       |
| UC08  | Accept/decline activity   |
| UC09  | Assign admin rights       |
| UC10  | Cancel membership         |
| UC11  | Manage profile            |

---

## 12. Design Principles for the Agent

* **Security first**
* **User-centric behavior**
* **Minimal friction**
* **Clear communication**
* **Scalable architecture awareness**

---

If you want, I can also:

* Turn this into a **system prompt for your AI agent**
* Break it into **microservices responsibilities**
* Or generate **API schemas (OpenAPI/Swagger)**
