# User Guide — RACATOM-LMIS

> **RACATOM Loan Management Information System**
> A comprehensive tool for managing loan accounts, collections, disbursements, and reporting.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Loans](#loans)
4. [Reports](#reports)
5. [Settings](#settings)
6. [Account & Security](#account--security)

---

## Getting Started

### Creating an Account

1. On the Login page, click **Create Account**
2. Fill in the required fields: Full Name, Email, Username, Password, Confirm Password, Designation, Contact Number, Address
3. Your password must meet these requirements:
   - At least 8 characters long
   - At least 1 uppercase letter (A–Z)
   - At least 1 lowercase letter (a–z)
   - At least 1 digit (0–9)
   - At least 1 special character (!@#$%^&* etc.)
4. Click **Register** — a verification email will be sent to your email address
5. Click the verification link in the email to activate your account

### Logging In

1. Enter your Username or Email and Password
2. Click **Login**
3. If your email is not yet verified, a message will appear with an option to resend the verification email

### Forgot Password

1. On the Login page, click **Forgot Password**
2. Enter your registered email address and click **Send Reset Link**
3. Check your email for a password reset link
4. Click the link and set a new password (same complexity rules apply)

### Auto-Logout

For security, the system automatically logs you out after **10 minutes of inactivity**. A warning message appears 1 minute before logout. Move your mouse or press any key to stay active.

---

## Dashboard

The Dashboard provides a quick overview of your loan portfolio.

### Summary Cards

| Card | Description |
|---|---|
| **Total Loans** | Total number of active loan accounts |
| **Total Disbursed** | Total amount disbursed across all loans |
| **Upcoming Payments** | Number of accounts with remaining balance |
| **Average Loan Amount** | Mean loan amount across all accounts |

### Charts

- **Loan Status Chart** — Shows distribution by status (Updated, Arrears, Past Due, Litigation, Dormant, Closed). Click any segment to see the list of loans in that status.
- **Loan Type Chart** — Distribution between New and Renewal loans. Clickable.
- **Loan Collector Chart** — Distribution of loans per collector. Clickable.

### Recent Loans Table

A paginated table showing the most recent loan records. Click any row to open the loan details.

### Quick Actions

- **New Loan Application** — Opens a 4-step application wizard:
  1. **General Info** — Borrower personal information
  2. **Document Requirements** — Upload required documents
  3. **Loan Info** — Select loan terms and rates
  4. **Review & Submit** — Verify all details and submit
- **Pending Applications** (badge shows count) — Review and approve or reject submitted loan applications

---

## Loans

The Loans page is the primary interface for managing all loan accounts.

### Filtering & Search

- **Search box** — Type any keyword and press Enter to search across all loan fields
- **Loan Status** dropdown — Filter by: UPDATED, ARREARS, PAST DUE, LITIGATION, DORMANT, CLOSED
- **Payment Mode** dropdown — Filter by: DAILY, WEEKLY, SEMI-MONTHLY, MONTHLY
- **Year** dropdown — Filter by loan year
- **Export Excel** — Download all filtered loans as an Excel spreadsheet

### Loan Table

A sortable, paginated table of all loan accounts. Page sizes: 10, 20, 50, or 100 records per page.

### Per-Loan Actions

Click the action menu on any loan row to:

| Action | Description |
|---|---|
| **View Loan** | Open full loan details (see below) |
| **View Collection Summary** | Jump directly to the Collections tab |
| **Generate Statement of Account** | Export a PDF Statement of Account |
| **Generate Loan Summary** | Export a PDF loan summary report |
| **Update Loan No.** | Change the loan number (for renewals, adds `-R` suffix) |
| **Update Status** | Manually change the loan status |

### Loan Details (5 Tabs)

When you open a loan, you'll see five tabs:

#### Tab 1: Personal Info
Borrower's name, address, contact information, civil status, and monthly income.

#### Tab 2: Loan Info
- Loan type, status, amount, balance, interest rates, dates, collector, and remarks
- **Edit** any editable field and save changes
- **Add/Edit/Delete** loan cycle records
- **Select Loan Rate** from pre-configured rate templates

#### Tab 3: Documents
- **Upload** documents (files are stored in Google Drive)
- **View** uploaded documents
- **Delete** documents you no longer need

#### Tab 4: Collections
Full collection management embedded within the loan (see [Collections](#managing-collections) below).

#### Tab 5: Account Security
Account-level security settings and audit information.

### Managing Collections

The Collections view (inside the Loan Details, Tab 4) lets you manage all payment records for a loan.

#### Collection Summary Panel

A collapsible panel at the top shows:
- Total Loan Amount
- Principal Amount
- Start / Maturity Date
- Total Collections Count
- Principal Paid / Interest Paid / Total Amount Collected / Total Penalty
- Remaining Balance

#### Adding Collections

Click **Add Collection** to record a new payment. Fill in:
- Payment date
- Amount
- Collector name
- Reference number
- Payment mode

#### Importing Collections

Use the **Import** dropdown to:
- **Upload .docx or .csv** — Parse payment records from a document file. A preview modal shows 3 tabs (Parsed Collections, Raw Lines, Raw JSON) so you can verify before saving.
- **Import from Collection Database** — Pull records from a shared collection database.

#### Editing / Deleting

- Click **Edit** on any collection row to modify it
- Click **Delete** to remove a collection (with confirmation)

#### Bulk Update Collector

1. Select multiple collection rows using the checkboxes
2. Click **Update Collector**
3. Choose the new collector name to assign to all selected rows

#### Exporting

Use the **Export** dropdown to download collections as:
- **Excel** spreadsheet
- **PDF** document

---

## Reports

Access the Reports section from the sidebar menu. Four report types are available as sub-menu items.

### Statement of Accounts

Generate formal Statements of Account for any loan:

1. Browse or search the loan list
2. Toggle **"Only with Collections"** to filter loans that have payment records
3. Click **Preview** to see collection summary (count, date range, total, balance)
4. Click **Generate PDF** to create a printable Statement of Account document

### Loan Report Generator

A flexible report builder:

1. **Select a Loan Account** from the searchable dropdown
2. Optionally set a **Date Range** to filter transactions
3. Choose a report type:
   - **Statement of Account** — Transaction table showing Payment Date, Description, Principal/Interest/Penalty Paid, Total Collected, Running Balance
   - **Ledger** — Accounting ledger with Date, Description, Debit, Credit, Running Balance
4. Click **Export to Excel** to download the report

### Collections List

A global view of all collections across all loans:

- Sortable columns: Client Name, Payment Date, Collector, Payment Mode (color-coded), Reference No., Amount, Balance
- **Search** by any keyword
- **Date filter** to narrow by date range
- **Include Duplicates** checkbox to show/hide duplicate entries
- **Edit** any collection directly from this view

### Account Vouchers

Generate professional voucher documents:

1. Browse or search the loan list
2. Click **Generate Voucher**
3. Choose voucher type:
   - **Disbursement** — Records of loan disbursement
   - **Payment Collection** — Summary of payments received
   - **Account Summary** — Overall account overview
4. Set date range and review the summary statistics
5. Click **Generate PDF** to create a printable A4 voucher

### Demand Letters

Generate formal demand letters for overdue accounts:

1. The list automatically filters to overdue loans (ARREARS, PAST DUE, LITIGATION, DORMANT)
2. Use the search bar or status filter to narrow results
3. Click **Generate** on any loan row
4. Choose letter type:
   - **Demand Letter** — Initial collection notice
   - **Final Demand Letter** — Escalated collection notice
   - **Notice of Delinquency** — Formal delinquency notice
5. Set the letter date and compliance deadline
6. Click **Generate PDF** to create the formal letter document

---

## Settings

Access Settings from the sidebar. Available sub-sections depend on your permissions.

### Employee Accounts

View and manage employee user accounts:

- **Card view** — Photo/avatar cards with status badges (online/offline)
- **Table view** — Tabular list of all employees
- **Edit** an employee — Update name, email, position, username, or photo
- Non-admin users can only edit their own profile

### Collector Accounts

Manage loan collectors:

- **Add** a new collector with name, code, and area route
- **Edit** existing collector details
- **Delete** collectors no longer active
- **Documents** — Upload files or add links for each collector, organized by category

### Database

*Requires elevated permissions.*

- **Database Health** — View connection status and statistics
- **Export** — Download any collection as JSON backup
- **Restore** — Upload a backup file to restore data
- **Account Management** — Search and manage accounts; **Cascade Delete** removes an account and all related records
- **Maintenance Mode** — Toggle the system into maintenance mode (shows a maintenance page to all users)

### Announcements

Create and manage system-wide announcements:

- **Add Announcement** — Set title, content, active status, and expiration date
- **Edit** existing announcements
- **Delete** old announcements
- **Toggle Active** — Use the switch to show/hide announcements in the notification bell
- Announcements appear in the notification bell icon in the header bar

### Accounting Center

Financial analytics dashboard with two tabs:

**Overview Tab:**
- Date range picker to filter by period
- Summary cards: Total Disbursed, Total Collected, Total Principal Collected, Total Interest Collected
- **Collections Over Time** — Area chart showing collection trends
- **Collection Breakdown** — Pie chart (Principal / Interest / Penalty)

**Transactions Tab:**
- Full table of all collection transactions with sorting
- Click **Details** to view or edit individual transaction details

### Loan Rates Configuration

Manage pre-defined loan rate templates:

- **Add** a new rate template — Set type (Regular/Special), payment mode, term, principal, processing fee, interest rate, penalty rate, and various other rate fields
- **Edit** existing rate configurations
- **Delete** unused rates
- Filter by type, mode, or search text
- These templates are selectable when creating new loans, auto-filling all rate fields

### Developer Settings

*Access: Developer role only.*

Advanced configuration panels:

| Panel | Purpose |
|---|---|
| **UI** | Toggle compact mode; choose theme presets; customize sidebar and header colors |
| **User Hierarchy** | Manage user roles and permissions; send password reset emails; set temporary passwords |
| **Security & Privacy** | Toggle username masking |
| **Diagnostics** | View debug information (API URL, environment, browser) |
| **Tools** | Password generator with configurable complexity |
| **Loans** | Configure automated loan status rules (grace periods for Dormant, Litigation, Past Due, Arrears) |
| **Collections** | Toggle deduplication on fetch; show/hide import actions |
| **Permissions** | Per-user menu access and action permissions (View/Edit/Delete for Loans, Collections, Reports, Users) |
| **Danger Zone** | Reset all developer settings to defaults |

---

## Account & Security

### Changing Your Password

1. Go to **Developer Settings → Change My Password** (if Developer) or contact your administrator
2. Enter your current password
3. Enter a new password meeting the complexity requirements
4. Confirm your new password
5. Click **Change Password**

### Understanding Roles

| Role | Access Level |
|---|---|
| **Developer** | Full system access including database management and developer settings |
| **Administrator** | Full business feature access; can manage employee accounts |
| **Manager** | Access based on assigned permissions |
| **Staff** | Access based on assigned permissions |
| **User** | Minimal access based on assigned permissions |

Your role determines which menu items you see in the sidebar and which actions you can perform. Contact your administrator if you need additional access.

### Notification Bell

The bell icon in the header shows unread announcements:
- A **red badge** indicates the number of unread items
- Click the bell to see all announcements
- Click an announcement to mark it as read
- Use **"Mark all as read"** to clear all notifications

### Session Security

- Access tokens expire every 15 minutes and are refreshed automatically
- All data stored in your browser is encrypted
- Closing the browser tab ends your session
- The system logs you out after 10 minutes of inactivity

---

## Keyboard & Interface Tips

- **Search fields** — Type your query and press **Enter** to search
- **Table sorting** — Click column headers to sort ascending/descending
- **Page size** — Use the dropdown at the bottom of tables to change rows per page
- **Modals** — Press **Escape** or click outside to close most modal dialogs
- **Date pickers** — Click the calendar icon to select dates
