"""
Generate RACATOM-LMIS User Manual PDF
Uses fpdf2 to create a professional user manual.
"""
from fpdf import FPDF
import os

class ManualPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        w = self.w - self.l_margin - self.r_margin
        self.cell(w / 2, 8, "RACATOM-LMIS User Manual", align="L")
        self.cell(w / 2, 8, f"Page {self.page_no()}", align="R")
        self.ln(8)
        self.line(10, 16, 200, 16)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "Confidential - For Internal Use Only | RACATOM Lending Corporation", align="C")

    def cover_page(self):
        self.add_page()
        self.ln(60)
        self.set_font("Helvetica", "B", 32)
        self.set_text_color(30, 60, 114)
        self.cell(0, 15, "RACATOM-LMIS", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.set_font("Helvetica", "", 16)
        self.set_text_color(80, 80, 80)
        self.cell(0, 10, "Loan Management Information System", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(15)
        self.set_draw_color(30, 60, 114)
        self.set_line_width(0.8)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(15)
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(50, 50, 50)
        self.cell(0, 12, "User Manual", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "Version 3.0", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "March 2026", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(40)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, "Prepared for: RACATOM Lending Corporation", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, "For Staff and Management Use", align="C", new_x="LMARGIN", new_y="NEXT")

    def section_title(self, num, title):
        self.add_page()
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(30, 60, 114)
        self.cell(0, 12, f"{num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(30, 60, 114)
        self.set_line_width(0.6)
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(8)

    def sub_title(self, title):
        self.ln(4)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(50, 80, 130)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def sub_sub_title(self, title):
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(70, 70, 70)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, f"     -  {text}", new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def numbered_step(self, num, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, f"     {num}.  {text}", new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def info_box(self, title, text):
        self.ln(2)
        self.set_fill_color(235, 242, 255)
        self.set_draw_color(30, 60, 114)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(30, 60, 114)
        self.cell(0, 7, f"  {title}", new_x="LMARGIN", new_y="NEXT", fill=True)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, f"  {text}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def simple_table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [190 / len(headers)] * len(headers)
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(30, 60, 114)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=1, fill=True, align="C")
        self.ln()
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 40)
        fill = False
        for row in rows:
            if fill:
                self.set_fill_color(245, 248, 255)
            else:
                self.set_fill_color(255, 255, 255)
            for i, cell_text in enumerate(row):
                self.cell(col_widths[i], 7, str(cell_text), border=1, fill=True)
            self.ln()
            fill = not fill
        self.set_x(self.l_margin)
        self.ln(4)


def build_manual():
    pdf = ManualPDF()

    # ─── COVER PAGE ───
    pdf.cover_page()

    # ─── TABLE OF CONTENTS ───
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(30, 60, 114)
    pdf.cell(0, 12, "Table of Contents", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    toc_items = [
        ("1", "Getting Started", "Logging in, creating accounts, password recovery"),
        ("2", "Dashboard", "Overview cards, charts, quick actions, loan applications"),
        ("3", "Messaging", "Sending messages, routing loans, group chats"),
        ("4", "Loans", "Managing loan accounts, cycles, documents"),
        ("5", "Collections", "Recording payments, importing, exporting"),
        ("6", "Reports", "Statements, vouchers, demand letters, collections list"),
        ("7", "Settings", "Employee accounts, collectors, loan rates, announcements"),
        ("8", "Accounting Center", "Financial overview and transaction management"),
        ("9", "Your Account & Security", "Passwords, roles, sessions, notifications"),
        ("10", "Quick Reference", "Tips, shortcuts, and common tasks"),
    ]
    for num, title, desc in toc_items:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(30, 60, 114)
        pdf.cell(10, 7, num + ".")
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(40, 40, 40)
        pdf.cell(60, 7, title)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 7, desc, new_x="LMARGIN", new_y="NEXT")

    # ═══════════════════════════════════════════════════════════
    # SECTION 1: GETTING STARTED
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("1", "Getting Started")

    pdf.sub_title("1.1 Opening the System")
    pdf.body_text("Open your web browser (Google Chrome is recommended) and type the following address in the address bar:")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 60, 114)
    pdf.cell(0, 7, "https://racatom-lmis.cloud", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.body_text("You will see the Login page with the RACATOM-LMIS logo. If there are any system announcements, they will appear on the left side of the login page.")

    pdf.sub_title("1.2 Logging In")
    pdf.body_text("To log into the system:")
    pdf.numbered_step(1, "Look for the login form on the page.")
    pdf.numbered_step(2, 'In the "Username or Email" field, type your username or your email address.')
    pdf.numbered_step(3, 'In the "Password" field, type your password.')
    pdf.numbered_step(4, 'Click the "Login" button.')
    pdf.numbered_step(5, "If your credentials are correct, you will be taken to the Dashboard.")
    pdf.ln(1)
    pdf.info_box("If Login Fails", "Check that your username and password are correct. If your email is not yet verified, the system will show a message with an option to resend the verification email. Click it to receive a new verification link.")

    pdf.sub_title("1.3 Creating a New Account")
    pdf.body_text("New employees need to request an account. Here is how:")
    pdf.numbered_step(1, 'On the Login page, look for the "Create Account" link at the bottom and click it.')
    pdf.numbered_step(2, "You will see a registration form. Fill in the following:")
    pdf.bullet("Full Name - Your complete name as used in the office.")
    pdf.bullet("Email Address - Your work email address.")
    pdf.bullet("Designation - Select your position from the dropdown (e.g., Staff, Manager).")
    pdf.numbered_step(3, 'Click the "Submit" button to send your registration request.')
    pdf.numbered_step(4, "Your request will be sent to the system administrator for approval.")
    pdf.numbered_step(5, "Once approved, you will receive an email with your login credentials (username and temporary password).")
    pdf.numbered_step(6, "Use those credentials to log in for the first time.")
    pdf.ln(1)
    pdf.info_box("Important", "You will need to change your temporary password when you log in for the first time. The system will prompt you automatically.")

    pdf.sub_title("1.4 Forgot Password")
    pdf.body_text("If you forgot your password, you can reset it yourself:")
    pdf.numbered_step(1, 'On the Login page, click the "Forgot Password" link.')
    pdf.numbered_step(2, "Enter the email address associated with your account.")
    pdf.numbered_step(3, 'Click "Send Code". A 6-digit verification code will be sent to your email.')
    pdf.numbered_step(4, "Check your email inbox (and spam/junk folder if needed).")
    pdf.numbered_step(5, "Enter the 6-digit code on the verification page.")
    pdf.numbered_step(6, "Set your new password. Make sure it meets the requirements below.")
    pdf.numbered_step(7, "Confirm your new password by typing it again.")
    pdf.numbered_step(8, 'Click "Reset Password" to save your new password.')
    pdf.numbered_step(9, "You will be redirected to the Login page. Log in with your new password.")
    pdf.ln(1)
    pdf.info_box("Password Requirements", "Your password must be at least 8 characters and include: one uppercase letter (A-Z), one lowercase letter (a-z), one number (0-9), and one special character (!@#$%^&*).")

    pdf.sub_title("1.5 First-Time Login (Temporary Password)")
    pdf.body_text("When you log in for the first time using a temporary password:")
    pdf.numbered_step(1, "The system will automatically show a Change Password screen.")
    pdf.numbered_step(2, "Enter your temporary password in the Current Password field.")
    pdf.numbered_step(3, "Choose a new password that meets the requirements.")
    pdf.numbered_step(4, "Confirm your new password.")
    pdf.numbered_step(5, 'Click "Change Password". You will then be taken to the Dashboard.')

    pdf.sub_title("1.6 Auto-Logout (Session Timeout)")
    pdf.body_text("For security, the system watches for inactivity:")
    pdf.bullet("If you do not move your mouse or type for 9 minutes, a warning popup will appear saying you will be logged out in 1 minute.")
    pdf.bullet("To stay logged in, simply move your mouse, click anywhere, or press any key.")
    pdf.bullet("If you do nothing for the full 10 minutes, the system will log you out automatically and return you to the Login page.")
    pdf.bullet("This protects your account if you walk away from your computer.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 2: DASHBOARD
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("2", "Dashboard")
    pdf.body_text("The Dashboard is your home screen after logging in. It gives you a quick overview of the entire loan portfolio at a glance. Everything on this page updates automatically when data changes.")

    pdf.sub_title("2.1 Summary Cards")
    pdf.body_text("At the top of the Dashboard, you will see colorful cards showing key numbers:")
    pdf.simple_table(
        ["Card", "What It Shows"],
        [
            ["Total Loans", "The total number of loan accounts in the system"],
            ["Total Disbursed", "The total peso amount lent out to all borrowers"],
            ["Upcoming Payments", "How many loans still have remaining balance"],
            ["Average Loan", "The average loan amount across all accounts"],
            ["Outstanding Balance", "Total unpaid balance across all loans"],
            ["Total Collected", "Total payments received from all borrowers"],
            ["Collection Rate", "Percentage: how much collected vs. how much lent out"],
        ],
        [55, 135]
    )
    pdf.body_text("You can click on the Upcoming Payments card to see the detailed list of those accounts.")

    pdf.sub_title("2.2 Charts")
    pdf.body_text("Below the summary cards, you will see several visual charts:")
    pdf.bullet("Loan Status Chart (Bar Chart) - Shows how many loans are in each status: Updated, Arrears, Past Due, Litigation, Dormant. Click any bar to see the specific loans.")
    pdf.bullet("Loan Type Chart (Pie Chart) - Shows the split between New loans and Renewal loans. Click a slice to see the list.")
    pdf.bullet("Loan Collector Chart - Shows how many loans each collector handles. Click to see which loans.")
    pdf.bullet("Monthly Disbursement Chart - Shows how much money was lent out each month, so you can see lending trends.")
    pdf.bullet("Payment Mode Chart - Shows how borrowers pay: Daily, Weekly, Semi-Monthly, or Monthly.")
    pdf.ln(1)
    pdf.info_box("Tip", "Clicking on any chart bar or pie slice opens a popup table showing the exact loans in that category. You can then click View on any loan to see its full details.")

    pdf.sub_title("2.3 Recent Loans Table")
    pdf.body_text("At the bottom of the Dashboard is a table showing recent loan records:")
    pdf.numbered_step(1, "Use the search box to filter by borrower name or loan number.")
    pdf.numbered_step(2, "Click any column header to sort the table (e.g., sort by Amount or Status).")
    pdf.numbered_step(3, "Use the page size dropdown at the bottom to show 10, 20, 50, or 100 rows.")
    pdf.numbered_step(4, 'Click "View" on any row to open the full loan details.')

    pdf.sub_title("2.4 New Loan Application")
    pdf.body_text('To create a new loan application, click the "New Loan Application" button on the Dashboard. The process has 4 steps:')
    pdf.sub_sub_title("Step 1: General Information")
    pdf.numbered_step(1, "Enter the borrower's personal details:")
    pdf.bullet("Full Name (Last Name, First Name, Middle Name)")
    pdf.bullet("Date of Birth")
    pdf.bullet("Complete Address")
    pdf.bullet("Contact Number")
    pdf.bullet("Civil Status")
    pdf.bullet("Spouse Name (if married)")
    pdf.bullet("Employer / Business Name")
    pdf.bullet("Monthly Income")
    pdf.bullet("Emergency Contact Person and Number")
    pdf.numbered_step(2, 'Click "Next" to proceed to Step 2.')

    pdf.sub_sub_title("Step 2: Document Requirements")
    pdf.numbered_step(1, "Upload any supporting documents for the loan application:")
    pdf.bullet("Valid ID (front and back)")
    pdf.bullet("Proof of Income (payslip, certificate of employment, etc.)")
    pdf.bullet("Proof of Billing (utility bill, etc.)")
    pdf.bullet("Any other required documents")
    pdf.numbered_step(2, 'Click "Upload" for each document, or drag and drop files into the upload area.')
    pdf.numbered_step(3, 'You can skip this step and upload documents later by clicking "Next".')

    pdf.sub_sub_title("Step 3: Loan Information")
    pdf.numbered_step(1, "Fill in the loan details:")
    pdf.bullet("Loan Amount - The total amount the borrower is requesting.")
    pdf.bullet("Loan Type - Select New (first-time borrower) or Renewal (returning borrower).")
    pdf.bullet("Payment Mode - Choose Daily, Weekly, Semi-Monthly, or Monthly.")
    pdf.bullet("Term - How many payment periods (e.g., 60 days, 12 weeks, 6 months).")
    pdf.numbered_step(2, 'Click "Select Loan Rate" to choose from pre-configured rate templates. This automatically fills in interest rate, processing fee, penalty rate, and other charges.')
    pdf.numbered_step(3, "Review the auto-calculated fields (amortization, total payable, etc.).")
    pdf.numbered_step(4, 'Click "Next" to proceed to the review.')

    pdf.sub_sub_title("Step 4: Review & Submit")
    pdf.numbered_step(1, "Carefully review all the information you entered in Steps 1-3.")
    pdf.numbered_step(2, "If anything is wrong, click the Back button to go to the appropriate step and fix it.")
    pdf.numbered_step(3, "When everything is correct, you have two options:")
    pdf.bullet('"Submit" - Saves the application directly into the system for review.')
    pdf.bullet('"Route to Manager" - Sends the application to a selected manager for approval via the Messaging system. Select the manager from the dropdown, add any notes, and click Send.')

    pdf.sub_title("2.5 Add Loan Collections (Quick Entry)")
    pdf.body_text('Click the "Add Loan Collections" button on the Dashboard to quickly record payments. You have two tabs:')

    pdf.sub_sub_title("File Upload Tab")
    pdf.numbered_step(1, "Click the File Upload tab.")
    pdf.numbered_step(2, "Drag and drop a .docx or .csv file into the upload area, or click Browse to select a file.")
    pdf.numbered_step(3, "The system reads the file and shows a preview table of the payment records found.")
    pdf.numbered_step(4, "Review each row. Use the checkboxes to select which records you want to import.")
    pdf.numbered_step(5, 'Click "Import Selected" to save the selected records to the system.')

    pdf.sub_sub_title("Manual Entry Tab")
    pdf.numbered_step(1, "Click the Manual Entry tab.")
    pdf.numbered_step(2, 'Type the borrower\'s name in the search box. As you type, matching names will appear - click the correct one.')
    pdf.numbered_step(3, "Select the loan cycle from the dropdown (if the borrower has multiple loans).")
    pdf.numbered_step(4, "Enter the payment details: Payment Date, Amount, Collector Name, Payment Via (Cash/Online/Bank), and any Remarks.")
    pdf.numbered_step(5, 'Click "Add Row" to add additional payments if needed.')
    pdf.numbered_step(6, 'When all entries are ready, click "Submit All" to save all records at once.')

    pdf.sub_title("2.6 Pending Applications")
    pdf.body_text('The "Pending Applications" button shows a badge with the number of loan applications awaiting review. Here is how to process them:')
    pdf.numbered_step(1, "Click the Pending Applications button. A list of all pending applications appears.")
    pdf.numbered_step(2, "Click on any application to see the full details (borrower info, loan info, documents).")
    pdf.numbered_step(3, "To approve: Click the Approve button. The loan will be created in the system.")
    pdf.numbered_step(4, "To reject: Click the Reject button. You must enter a reason for the rejection. The applicant will be notified.")
    pdf.numbered_step(5, "To re-apply a rejected application: Click Re-apply. The loan application form opens with the previous data pre-filled so you can make corrections and resubmit.")
    pdf.ln(1)
    pdf.info_box("Note", "The pending count refreshes automatically every 10 seconds, so you will see new applications as they come in.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 3: MESSAGING
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("3", "Messaging")
    pdf.body_text("The Messaging section is your internal communication tool. Use it to send messages to other employees, route loan applications to managers for review, and participate in group conversations. Find it in the sidebar menu.")

    pdf.sub_title("3.1 Sending a Message")
    pdf.numbered_step(1, "Click Messages in the sidebar to open the Messaging page.")
    pdf.numbered_step(2, 'Click the "Compose" button at the top.')
    pdf.numbered_step(3, 'In the "To" field, click to select one or more recipients from the list of employees.')
    pdf.numbered_step(4, 'Type a subject in the "Subject" field (e.g., "Loan Update for Juan dela Cruz").')
    pdf.numbered_step(5, "Choose the Priority level: Normal (default), Urgent (for time-sensitive matters), or Low.")
    pdf.numbered_step(6, "Type your message in the large text area.")
    pdf.numbered_step(7, "To attach files: Click the attachment (paperclip) icon. Select the file from your computer. You can attach multiple files.")
    pdf.numbered_step(8, 'Click "Send" to deliver the message. It will appear in the recipient\'s Inbox.')

    pdf.sub_title("3.2 Routing a Loan Application to a Manager")
    pdf.body_text("When you need a manager to review a loan application before it is processed:")
    pdf.numbered_step(1, "Open the Messaging page and click Compose.")
    pdf.numbered_step(2, 'Click the "Route Loan" tab/option in the compose area.')
    pdf.numbered_step(3, "In the loan search field, type the borrower's name or account number. Select the correct application from the results.")
    pdf.numbered_step(4, "Select the manager(s) who should review the application.")
    pdf.numbered_step(5, "Set the priority (Normal or Urgent).")
    pdf.numbered_step(6, "Add any notes or instructions in the message body (e.g., reasons for the loan, special considerations).")
    pdf.numbered_step(7, 'Click "Send". The manager will receive the message with the loan application details embedded in it.')
    pdf.numbered_step(8, "The manager can then review the application details directly from the message and take action.")

    pdf.sub_title("3.3 Managing Your Messages")
    pdf.body_text("Your messages are organized into folders:")

    pdf.sub_sub_title("Inbox")
    pdf.body_text("Shows all messages you have received. Unread messages are highlighted. The sidebar shows the unread count as a number badge.")

    pdf.sub_sub_title("Sent Items")
    pdf.body_text("Shows all messages you have sent to others.")

    pdf.sub_sub_title("Archived")
    pdf.body_text("Messages you have moved to Archive for safekeeping. Use this for important messages you want to keep but want out of your inbox.")

    pdf.sub_sub_title("Deleted")
    pdf.body_text("Messages you have deleted. They stay here for 30 days before being permanently removed. The countdown is shown next to each message.")

    pdf.sub_title("3.4 Reading, Replying, and Managing Messages")
    pdf.numbered_step(1, "Click any message in your Inbox (or other folder) to open it.")
    pdf.numbered_step(2, "Read the message content. If the message is a Routed Loan, you will see the loan application details embedded below the message.")
    pdf.numbered_step(3, "If there are attachments, click on any file name to download it.")
    pdf.numbered_step(4, "To reply: Click the Reply button. The recipient and subject are pre-filled. Type your response and click Send.")
    pdf.numbered_step(5, "To archive: Click Archive to move the message to your Archive folder.")
    pdf.numbered_step(6, "To delete: Click Delete to move the message to the Deleted folder.")
    pdf.numbered_step(7, "In the Deleted folder, you can permanently delete a message or move it back to Inbox.")

    pdf.sub_title("3.5 Group Chats")
    pdf.body_text("Group Chats allow teams to communicate in real-time, similar to a chat room. Find them in the left sidebar of the Messaging page.")

    pdf.sub_sub_title("Creating a New Group Chat")
    pdf.numbered_step(1, 'In the Messaging sidebar, look for the "Group Chats" section and click "Create Group".')
    pdf.numbered_step(2, "Enter a name for the group (e.g., Collection Team, Management Updates).")
    pdf.numbered_step(3, "Optionally enter a description explaining the group's purpose.")
    pdf.numbered_step(4, "Select members from the employee list. They are organized by position for easy selection.")
    pdf.numbered_step(5, 'If you want only group admins to be able to post messages, turn on the "Only Admins Can Post" switch.')
    pdf.numbered_step(6, 'Click "Create" to set up the group. You will be added as the group admin automatically.')

    pdf.sub_sub_title("Chatting in a Group")
    pdf.numbered_step(1, "Click on any group chat in the sidebar to open the conversation.")
    pdf.numbered_step(2, "You will see the chat history with messages from all members.")
    pdf.numbered_step(3, "Type your message in the text box at the bottom of the screen.")
    pdf.numbered_step(4, "Press Enter or click the Send button to send your message.")
    pdf.numbered_step(5, "To attach a file: Click the attachment icon, select the file (up to 15 MB). Images will appear directly in the chat. Documents will appear as downloadable links.")
    pdf.numbered_step(6, "The chat refreshes automatically every few seconds, so new messages appear without reloading.")

    pdf.sub_sub_title("Managing a Group (Group Admins)")
    pdf.body_text("If you are a group admin, click the Settings icon in the group chat to:")
    pdf.bullet("Edit the group name and description.")
    pdf.bullet("Add new members - search and select from the employee list.")
    pdf.bullet("Remove members - click Remove next to a member's name.")
    pdf.bullet("Promote a member to group admin - click Promote next to their name.")
    pdf.bullet("Demote an admin back to regular member - click Demote.")
    pdf.bullet('Turn "Only Admins Can Post" on or off.')

    pdf.sub_title("3.6 Messaging Settings")
    pdf.body_text("Click the settings (gear) icon on the Messaging page to configure your preferences:")
    pdf.bullet("Email Notifications - Turn on to receive an email alert whenever you get a new message in the system.")
    pdf.bullet("Email Signature - Type a signature that will be automatically added to the bottom of every message you send.")
    pdf.bullet("Auto-Archive After (days) - Set a number of days. Read messages older than this will be automatically moved to your Archive folder.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 4: LOANS
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("4", "Loans")
    pdf.body_text("The Loans page is where you manage all loan accounts. It shows a searchable and sortable table of every loan in the system. Click Loans in the sidebar to access it.")

    pdf.sub_title("4.1 Finding a Loan")
    pdf.body_text("The loan list can be filtered in several ways:")
    pdf.numbered_step(1, 'Search Box - Type a borrower\'s name, account number, or loan number in the search box at the top and press Enter. For example, type "Juan" to find all borrowers named Juan.')
    pdf.numbered_step(2, "Loan Status Dropdown - Click the dropdown and select a status to show only loans with that status (Updated, Arrears, Past Due, Litigation, Dormant, or Closed).")
    pdf.numbered_step(3, "Payment Mode Dropdown - Filter by how the borrower pays (Daily, Weekly, Semi-Monthly, or Monthly).")
    pdf.numbered_step(4, "Year Dropdown - Show only loans created in a specific year.")
    pdf.numbered_step(5, "You can combine multiple filters. For example, select Status = Arrears and Payment Mode = Daily to see all daily-payment loans that are in arrears.")
    pdf.numbered_step(6, "To clear all filters, remove the search text and reset the dropdowns.")

    pdf.sub_title("4.2 Loan Table Actions")
    pdf.body_text("The loan table shows columns for: Applicant Name, Loan Number, Amount, Balance, Payment Mode, Status, Collector, and more. For each loan, you can:")
    pdf.bullet('Click "View" to open the full loan details (see Section 4.3).')
    pdf.bullet('"View Collection Summary" to jump directly to the payment history.')
    pdf.bullet('"Generate Statement of Account" to create a PDF statement.')
    pdf.bullet('"Generate Loan Summary" to create a PDF summary report.')
    pdf.bullet('"Update Loan No." to change the loan number (adds -R suffix for renewals).')
    pdf.bullet('"Update Status" to manually change the loan status.')

    pdf.sub_title("4.3 Loan Details (5 Tabs)")
    pdf.body_text('When you click "View" on a loan, a detail screen opens with 5 tabs:')

    pdf.sub_sub_title("Tab 1: Personal Information")
    pdf.body_text("Shows and lets you edit the borrower's personal details:")
    pdf.bullet("Full Name, Date of Birth, Address, Contact Number")
    pdf.bullet("Civil Status, Spouse Name (if married)")
    pdf.bullet("Employer / Business, Monthly Income")
    pdf.bullet("Emergency Contact Person and Number")
    pdf.body_text("To edit: Click the Edit button, make changes, and click Save. Only authorized users can edit borrower information.")

    pdf.sub_sub_title("Tab 2: Loan Information")
    pdf.body_text("Shows all loan cycles for this borrower. A borrower can have multiple loan cycles (e.g., original loan and a renewal).")
    pdf.body_text("For each loan cycle, you can see: Loan Number, Type, Amount, Balance, Amortization, Interest Rate, Payment Mode, Term, Start Date, Maturity Date, Collector, and Status.")

    pdf.body_text("How to add a new loan cycle:")
    pdf.numbered_step(1, 'Click the "Add" button.')
    pdf.numbered_step(2, "Fill in all the loan details (amount, type, payment mode, term, etc.).")
    pdf.numbered_step(3, 'Click "Select Loan Rate" to choose a pre-configured rate template. This fills in interest, fees, and charges automatically.')
    pdf.numbered_step(4, 'Click "Save" to create the loan cycle.')

    pdf.body_text("How to edit an existing loan cycle:")
    pdf.numbered_step(1, "Click the Edit icon next to the loan cycle row.")
    pdf.numbered_step(2, "Modify the fields you need to change (amount, status, collector, dates, etc.).")
    pdf.numbered_step(3, 'Click "Save" to apply changes.')

    pdf.sub_sub_title("Tab 3: Collections")
    pdf.body_text("Shows all payment records for the selected loan. This is where you add, edit, import, and export payments. See Section 5 (Collections) for detailed step-by-step instructions.")

    pdf.sub_sub_title("Tab 4: Documents")
    pdf.body_text("Upload and manage documents related to this loan:")
    pdf.numbered_step(1, 'Click "Upload Document" and select a file from your computer (ID copies, contracts, proof of income, etc.).')
    pdf.numbered_step(2, "The file is uploaded and stored securely in the cloud (Google Drive).")
    pdf.numbered_step(3, "All uploaded documents appear in a list. Click on any document to view or download it.")
    pdf.numbered_step(4, "To remove a document you no longer need, click the Delete button next to it and confirm.")

    pdf.sub_sub_title("Tab 5: Account Security")
    pdf.body_text("View or update the account identifiers:")
    pdf.bullet("Client Number - A unique number assigned to the borrower")
    pdf.bullet("Primary Loan Number - The main loan number for this account")
    pdf.bullet("Account ID - The system-generated account identifier")

    pdf.sub_title("4.4 Exporting Loan Data")
    pdf.body_text("To download loan data as a spreadsheet:")
    pdf.numbered_step(1, "On the Loans page, apply any filters you want (status, payment mode, year).")
    pdf.numbered_step(2, 'Click the "Export Excel" button.')
    pdf.numbered_step(3, "An Excel file (.xlsx) will download to your computer containing all the filtered loan records.")
    pdf.numbered_step(4, "Open it in Microsoft Excel or Google Sheets to view, print, or analyze.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 5: COLLECTIONS
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("5", "Collections")
    pdf.body_text("Collections are the payment records for each loan. Every time a borrower makes a payment, it is recorded here. You access Collections from two places:")
    pdf.bullet("Tab 3 inside any loan's details (click View on a loan, then go to Collections tab)")
    pdf.bullet("The Add Loan Collections button on the Dashboard (for quick entry)")

    pdf.sub_title("5.1 Understanding the Collection Summary")
    pdf.body_text("At the top of the Collections tab, you will see a collapsible summary panel. Click it to expand or collapse. It shows:")
    pdf.bullet("Total Loan Amount and Principal Amount")
    pdf.bullet("Start Date and Maturity Date of the loan")
    pdf.bullet("Total Collections Count - how many payments have been made")
    pdf.bullet("Principal Paid - how much of the original loan has been paid back")
    pdf.bullet("Interest Paid - how much interest has been collected")
    pdf.bullet("Total Penalty - total penalties charged")
    pdf.bullet("Total Amount Collected - the total money received")
    pdf.bullet("Remaining Balance - how much the borrower still owes")

    pdf.sub_title("5.2 Adding a Payment Manually")
    pdf.body_text("To record a new payment from a borrower:")
    pdf.numbered_step(1, 'Open the loan\'s Collections tab and click "Add Collection".')
    pdf.numbered_step(2, "A form will appear. Fill in the following:")
    pdf.bullet("Payment Amount - The amount the borrower paid (numbers only, e.g., 500)")
    pdf.bullet("Payment Via - Select how the payment was made: Cash, Online Banking, or Bank Deposit")
    pdf.bullet("Payment Type - Select the type of payment (Regular, Advance, etc.)")
    pdf.bullet("Date Received - The date the payment was received from the borrower")
    pdf.bullet("Date Processed - The date the payment was processed/recorded")
    pdf.bullet("Collector - Select the collector who received the payment from the dropdown")
    pdf.bullet("Reference Number - Enter the receipt or transaction reference number (if any)")
    pdf.bullet("Remarks - Any additional notes about this payment")
    pdf.numbered_step(3, 'Review the details and click "Save" to record the payment.')
    pdf.numbered_step(4, "The payment will appear in the Collections table and the balance will update automatically.")

    pdf.sub_title("5.3 Importing Payments from a File")
    pdf.body_text("If you have payment records in a Word (.docx) or spreadsheet (.csv) file, you can import them in bulk:")
    pdf.numbered_step(1, 'In the Collections tab, click "Import" and select "Upload File".')
    pdf.numbered_step(2, 'A file upload area appears. Drag and drop your file into it, or click "Browse" to select the file from your computer.')
    pdf.numbered_step(3, "The system will read and parse the file automatically. A preview table appears showing all payment records found in the file.")
    pdf.numbered_step(4, "Review each row carefully. The columns show: Payment Date, Reference Number, Payment Amount, Running Balance, and Penalty.")
    pdf.numbered_step(5, "Use the checkboxes on the left to select which records you want to import. By default, all are selected.")
    pdf.numbered_step(6, "Uncheck any rows that are incorrect or that you don't want to import.")
    pdf.numbered_step(7, 'Click "Import Selected" to save all checked records to the system.')
    pdf.numbered_step(8, "The imported payments will appear in the Collections table immediately.")
    pdf.ln(1)
    pdf.info_box("Tip", "You can see three views of the uploaded file: Parsed Collections (the cleaned data), Raw Lines (the original text), and Raw JSON (for troubleshooting). Use the Parsed Collections tab to verify the data before importing.")

    pdf.sub_title("5.4 Editing a Payment")
    pdf.numbered_step(1, "Find the payment you want to edit in the Collections table.")
    pdf.numbered_step(2, "Click the Edit icon (pencil) on that row.")
    pdf.numbered_step(3, "An edit form will open with all the current values pre-filled.")
    pdf.numbered_step(4, "Change the fields you need to update.")
    pdf.numbered_step(5, 'Click "Save" to apply the changes.')

    pdf.sub_title("5.5 Deleting a Payment")
    pdf.numbered_step(1, "Find the payment you want to delete in the Collections table.")
    pdf.numbered_step(2, "Click the Delete icon (trash can) on that row.")
    pdf.numbered_step(3, 'A confirmation dialog will appear asking "Are you sure?".')
    pdf.numbered_step(4, 'Click "Yes" to permanently delete the record, or "No" to cancel.')

    pdf.sub_title("5.6 Changing the Collector for Multiple Payments")
    pdf.body_text("If a collector's assignment changes and you need to update many records:")
    pdf.numbered_step(1, "In the Collections table, use the checkboxes on the left to select all the payments you want to update.")
    pdf.numbered_step(2, 'Click the "Update Collector" button that appears above the table.')
    pdf.numbered_step(3, "A dropdown will appear. Select the new collector's name.")
    pdf.numbered_step(4, 'Click "Apply". All selected payments will be reassigned to the new collector.')

    pdf.sub_title("5.7 Exporting Payment Records")
    pdf.body_text("To download payment records for printing or analysis:")
    pdf.numbered_step(1, 'Click the "Export" button in the Collections tab.')
    pdf.numbered_step(2, "Choose the format:")
    pdf.bullet("Excel (.xlsx) - Best for editing, sorting, and analysis in a spreadsheet")
    pdf.bullet("PDF - Best for printing or sharing as a formal document")
    pdf.numbered_step(3, "The file will download to your computer automatically.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 6: REPORTS
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("6", "Reports")
    pdf.body_text("The Reports section provides tools to generate formal documents and analyze collection data. Access it by clicking Reports in the sidebar, then choosing a sub-item.")

    pdf.sub_title("6.1 Statement of Accounts (SOA)")
    pdf.body_text("Generate a formal Statement of Account document for any loan:")
    pdf.numbered_step(1, 'Click Reports in the sidebar, then click "Statement of Accounts".')
    pdf.numbered_step(2, "You will see a table of all loan accounts. Use the search box to find a specific borrower.")
    pdf.numbered_step(3, 'If you only want to see loans that have payment records, turn on the "Only with Collections" toggle.')
    pdf.numbered_step(4, 'Find the loan and click "Preview" to see a summary: total payments, date range, total collected, and remaining balance.')
    pdf.numbered_step(5, 'Click "Generate PDF" to create the formal Statement of Account document.')
    pdf.numbered_step(6, "The PDF will open in a new tab or download automatically. You can print it or save it.")
    pdf.ln(1)
    pdf.body_text("The Statement of Account PDF includes: borrower information, loan details, a complete table of all payments with dates, amounts, and running balances, and the final balance.")

    pdf.sub_title("6.2 Collections List")
    pdf.body_text("View all payment records across ALL loans in one place:")
    pdf.numbered_step(1, 'Click Reports in the sidebar, then click "Collections List".')
    pdf.numbered_step(2, "A large table appears with all payments from all borrowers.")
    pdf.numbered_step(3, "Use the search box to filter by borrower name, reference number, or collector name.")
    pdf.numbered_step(4, "Use the date picker to show only payments within a specific date range.")
    pdf.numbered_step(5, "Click any column header to sort (e.g., sort by Payment Date or Amount).")
    pdf.numbered_step(6, 'To edit a payment, click the Edit button on its row. Change the details and click Save.')
    pdf.numbered_step(7, 'Use the "Include Duplicates" toggle to show or hide duplicate payment entries.')

    pdf.sub_title("6.3 Account Vouchers")
    pdf.body_text("Generate professional voucher documents for any loan account:")
    pdf.numbered_step(1, 'Click Reports in the sidebar, then click "Account Vouchers".')
    pdf.numbered_step(2, "Search and select the loan account you want to generate a voucher for.")
    pdf.numbered_step(3, "Set the date range to filter which transactions to include.")
    pdf.numbered_step(4, "Review the summary statistics shown: Total Payments, Principal Paid, Interest Paid, Penalty, and Balance.")
    pdf.numbered_step(5, 'Click "Generate PDF" to create the voucher document.')
    pdf.numbered_step(6, "The PDF will be formatted for A4 paper and ready to print.")

    pdf.sub_title("6.4 Demand Letters")
    pdf.body_text("Generate formal demand letters for borrowers with overdue loans:")
    pdf.numbered_step(1, 'Click Reports in the sidebar, then click "Demand Letters".')
    pdf.numbered_step(2, "The system automatically shows only overdue loans (status: Arrears, Past Due, Litigation, or Dormant).")
    pdf.numbered_step(3, "Use the search bar to find a specific borrower, or filter by status.")
    pdf.numbered_step(4, 'Click "Generate" next to the loan you want to send a letter for.')
    pdf.numbered_step(5, "A preview screen opens. Choose the letter type:")
    pdf.bullet("Demand Letter - An initial notice asking the borrower to pay their overdue balance.")
    pdf.bullet("Final Demand Letter - A stronger notice for borrowers who have not responded to the first demand.")
    pdf.bullet("Notice of Delinquency - A formal notice that the account has been flagged as delinquent.")
    pdf.numbered_step(6, "Set the Letter Date (usually today's date).")
    pdf.numbered_step(7, "Set the Compliance Deadline (the date by which the borrower must respond).")
    pdf.numbered_step(8, "The letter title and body text are pre-filled, but you can edit them if needed.")
    pdf.numbered_step(9, 'Click "Generate PDF" to create the formal letter.')
    pdf.numbered_step(10, "Print the letter and send it to the borrower through your regular delivery process.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 7: SETTINGS
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("7", "Settings")
    pdf.body_text("The Settings section is where you manage employee accounts, collectors, loan rates, announcements, and system configuration. Click Settings in the sidebar to see the available options. What you see depends on your role and permissions.")

    pdf.sub_title("7.1 Employee Accounts")
    pdf.body_text("View and manage all employee user accounts in the system:")

    pdf.sub_sub_title("Viewing Employees")
    pdf.numbered_step(1, 'Click Settings, then "Employee Accounts" in the sidebar.')
    pdf.numbered_step(2, "You can switch between two views:")
    pdf.bullet("Card View - Shows employee photo cards organized by position. Green dot = online, gray = offline.")
    pdf.bullet("Table View - Shows all employees in a sortable table with columns for Name, Email, Position, Status.")
    pdf.numbered_step(3, "Use the search box to find a specific employee.")

    pdf.sub_sub_title("Editing an Employee Profile")
    pdf.numbered_step(1, 'Click "Edit" on the employee card or table row.')
    pdf.numbered_step(2, "You can update: Full Name, Email Address, Position, Username, and Profile Photo.")
    pdf.numbered_step(3, "To change the photo: Click the photo area and select a new image file.")
    pdf.numbered_step(4, 'Click "Save" to apply the changes.')
    pdf.ln(1)
    pdf.info_box("Note", "Regular staff members can only edit their own profile. Administrators and Developers can edit anyone's profile.")

    pdf.sub_title("7.2 Collector Accounts")
    pdf.body_text("Manage the loan collectors who handle field collection:")

    pdf.sub_sub_title("Adding a New Collector")
    pdf.numbered_step(1, 'Click Settings, then "Collector Accounts".')
    pdf.numbered_step(2, 'Click the "Add Collector" button.')
    pdf.numbered_step(3, "Fill in: Collector Name, Collector Code, and Area Route (the area/route assigned).")
    pdf.numbered_step(4, 'Click "Save".')

    pdf.sub_sub_title("Editing or Deleting a Collector")
    pdf.numbered_step(1, "Find the collector in the table.")
    pdf.numbered_step(2, "Click Edit to update their details, or Delete to remove them.")
    pdf.numbered_step(3, "When editing, change the fields you need and click Save.")

    pdf.sub_sub_title("Managing Collector Documents")
    pdf.numbered_step(1, "Click the Documents button on the collector's row.")
    pdf.numbered_step(2, "Upload files (e.g., route maps, performance reports) by clicking Upload and selecting files.")
    pdf.numbered_step(3, "Documents are organized by category for easy reference.")
    pdf.numbered_step(4, "Click on any document to view or download it. Click Delete to remove it.")

    pdf.sub_title("7.3 Loan Rates Configuration")
    pdf.body_text("Set up pre-defined loan rate templates. When creating a new loan, staff can select a rate template instead of manually entering all the rate fields.")

    pdf.sub_sub_title("Adding a New Rate Template")
    pdf.numbered_step(1, 'Click Settings, then "Loan Rates Configuration".')
    pdf.numbered_step(2, 'Click "Add Rate".')
    pdf.numbered_step(3, "Fill in all the fields:")
    pdf.bullet("Type - Regular or Special")
    pdf.bullet("Payment Mode - Daily, Weekly, Semi-Monthly, or Monthly")
    pdf.bullet("Term - The number of payment periods")
    pdf.bullet("Principal Amount - The base loan amount")
    pdf.bullet("Processing Fee - The one-time fee charged for processing")
    pdf.bullet("Interest Rate - The interest percentage per period")
    pdf.bullet("Penalty Rate - The penalty percentage for late payments")
    pdf.bullet("Other rates: Notarial, Annotation, Insurance, VAT, Documentary, Miscellaneous")
    pdf.numbered_step(4, 'Click "Save" to create the rate template.')

    pdf.sub_sub_title("Using Rate Templates")
    pdf.body_text("When creating or editing a loan cycle (in the Loan Details, Tab 2), look for the Select Loan Rate button. Clicking it shows a list of all configured rate templates. Selecting one automatically fills in all the rate fields, saving time and ensuring accuracy.")

    pdf.sub_title("7.4 Announcements")
    pdf.body_text("Create system-wide announcements that appear in the notification bell for all users and on the Login page:")
    pdf.numbered_step(1, 'Click Settings, then "Announcements".')
    pdf.numbered_step(2, 'Click "Add Announcement".')
    pdf.numbered_step(3, "Fill in:")
    pdf.bullet("Title - A short headline for the announcement")
    pdf.bullet("Content - The full message body")
    pdf.bullet("Priority - Low, Normal, High, or Urgent")
    pdf.bullet("Active - Toggle on/off to show or hide the announcement")
    pdf.bullet("Validity Date Range - When the announcement should be displayed")
    pdf.bullet("Expiration Date - When to automatically remove it")
    pdf.bullet("Link URL - Optional link for more information")
    pdf.numbered_step(4, 'Click "Save" to publish the announcement.')
    pdf.numbered_step(5, "Users will see it in their notification bell and on the login page.")
    pdf.ln(1)
    pdf.info_box("Access", "Only system administrators and developers can create or manage announcements.")

    pdf.sub_title("7.5 Database Management")
    pdf.body_text("Advanced tools for managing the system database. Use with caution.")
    pdf.bullet("Database Health - Check the connection status and view statistics.")
    pdf.bullet("Export - Download any data collection as a backup file (JSON format).")
    pdf.bullet("Restore - Upload a backup file to restore data.")
    pdf.bullet("Maintenance Mode - Turn this on to temporarily block access for all regular users during system maintenance. Other users will see a maintenance page.")
    pdf.bullet("Account Management - Search for accounts and perform administrative actions. The Cascade Delete option removes a borrower and ALL related data (loan cycles, collections, documents, etc.).")
    pdf.ln(1)
    pdf.info_box("Warning", "Database operations affect all users. Always create a backup before making changes. Only use Cascade Delete when you are absolutely certain. Deleted data cannot be recovered.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 8: ACCOUNTING CENTER
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("8", "Accounting Center")
    pdf.body_text("The Accounting Center provides financial analysis for management. Find it under Settings in the sidebar.")

    pdf.sub_title("8.1 Overview Tab")
    pdf.body_text("The Overview gives you a financial snapshot of your operations:")
    pdf.numbered_step(1, "Click Settings, then Accounting Center.")
    pdf.numbered_step(2, "Use the date range picker at the top to select the time period you want to analyze (e.g., last 30 days, last quarter, or a custom range).")
    pdf.numbered_step(3, "Review the summary cards:")
    pdf.bullet("Total Disbursed - How much money was lent out in the selected period")
    pdf.bullet("Total Collected - How much money was received from borrowers")
    pdf.bullet("Total Principal Collected - The portion of collections that went toward paying the principal")
    pdf.bullet("Total Interest Collected - The portion that was interest income")
    pdf.numbered_step(4, 'Below the cards, see the "Collections Over Time" chart - an area chart showing daily/weekly collection amounts over the selected period.')
    pdf.numbered_step(5, 'The "Collection Breakdown" pie chart shows what percentage of collections are Principal, Interest, and Penalty.')

    pdf.sub_title("8.2 Transactions Tab")
    pdf.body_text("View and manage individual collection transactions:")
    pdf.numbered_step(1, "Click the Transactions tab.")
    pdf.numbered_step(2, "A detailed table appears with all transactions: Date, Account ID, Client Number, Loan Cycle, Collector, Payment Mode, Amount, and Remarks.")
    pdf.numbered_step(3, "Click any column header to sort the data.")
    pdf.numbered_step(4, "Use the search box to find specific transactions.")
    pdf.numbered_step(5, "Click Details on any row to view the complete transaction information or make edits.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 9: YOUR ACCOUNT & SECURITY
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("9", "Your Account & Security")

    pdf.sub_title("9.1 Understanding Your Role")
    pdf.body_text("Your role determines what menu items you see and what actions you can perform:")
    pdf.simple_table(
        ["Role", "What You Can Do"],
        [
            ["Developer", "Full access to everything including technical tools and system settings"],
            ["Administrator", "Manage all business features, employee accounts, and settings"],
            ["Manager", "Access based on permissions assigned by the administrator"],
            ["Staff", "Access based on permissions assigned by the administrator"],
        ],
        [45, 145]
    )
    pdf.body_text("If you need access to a feature you cannot see, contact your administrator or developer. They can adjust your permissions.")

    pdf.sub_title("9.2 Sidebar Menu")
    pdf.body_text("The sidebar on the left shows your available menu items. Which items you see depends on your permissions:")
    pdf.bullet("Dashboard - Your home screen with summary and charts")
    pdf.bullet("Messages - Internal messaging and group chats")
    pdf.bullet("Loans - Manage all loan accounts")
    pdf.bullet("Reports - Generate statements, vouchers, and demand letters")
    pdf.bullet("Settings - Manage employees, collectors, rates, and system options")
    pdf.body_text("Click the collapse button (arrows at the top of the sidebar) to minimize the sidebar and get more screen space.")

    pdf.sub_title("9.3 Notification Bell")
    pdf.body_text("The bell icon in the top-right corner of the screen shows system announcements:")
    pdf.numbered_step(1, "A red number badge on the bell shows how many unread announcements you have.")
    pdf.numbered_step(2, "Click the bell to see all announcements in a dropdown.")
    pdf.numbered_step(3, "Click on any announcement to expand it and mark it as read.")
    pdf.numbered_step(4, 'Click "Mark all as read" at the bottom to clear all notifications at once.')

    pdf.sub_title("9.4 Message Notifications")
    pdf.body_text("The envelope icon in the top-right corner shows your messages:")
    pdf.numbered_step(1, "A red badge shows the number of unread messages.")
    pdf.numbered_step(2, "Click the icon to see a preview of your 5 most recent messages.")
    pdf.numbered_step(3, "Click any message in the preview to go directly to the Messaging page.")

    pdf.sub_title("9.5 Live Clock")
    pdf.body_text("The current date and time are displayed in the top bar, updated every second. This uses the Manila (Philippine) timezone.")

    pdf.sub_title("9.6 Logging Out")
    pdf.body_text("To log out of the system:")
    pdf.numbered_step(1, "Click your name/photo in the top-right corner of the screen.")
    pdf.numbered_step(2, "A dropdown appears showing your name and position.")
    pdf.numbered_step(3, 'Click "Logout" to end your session and return to the Login page.')

    pdf.sub_title("9.7 Session Security")
    pdf.body_text("The system has several security measures to protect your account:")
    pdf.bullet("Auto-Logout - You are automatically logged out after 10 minutes of inactivity.")
    pdf.bullet("Session Isolation - Each browser tab has its own separate session. You can safely use multiple tabs.")
    pdf.bullet("Encrypted Storage - Your session data is encrypted in the browser.")
    pdf.bullet("Automatic Token Refresh - Your login session is refreshed automatically in the background so you don't have to keep logging in during normal use.")

    # ═══════════════════════════════════════════════════════════
    # SECTION 10: QUICK REFERENCE
    # ═══════════════════════════════════════════════════════════
    pdf.section_title("10", "Quick Reference")

    pdf.sub_title("10.1 Common Tasks - Where to Go")
    pdf.simple_table(
        ["What You Want to Do", "Where to Find It"],
        [
            ["Record a new payment", "Dashboard > Add Loan Collections"],
            ["Record a payment for a specific loan", "Loans > View Loan > Collections tab > Add"],
            ["Apply for a new loan", "Dashboard > New Loan Application"],
            ["Check pending loan applications", "Dashboard > Pending Applications"],
            ["Send a message to a colleague", "Messages > Compose"],
            ["Route a loan to a manager", "Messages > Compose > Route Loan"],
            ["Create a group chat", "Messages > Group Chats > Create"],
            ["Generate a Statement of Account", "Reports > Statement of Accounts"],
            ["Generate a demand letter", "Reports > Demand Letters"],
            ["Create an account voucher", "Reports > Account Vouchers"],
            ["View all payments system-wide", "Reports > Collections List"],
            ["Add a new collector", "Settings > Collector Accounts > Add"],
            ["Set up loan rate templates", "Settings > Loan Rates Config"],
            ["Post an announcement", "Settings > Announcements"],
            ["View financial summary", "Settings > Accounting Center"],
            ["Export loans to Excel", "Loans page > Export Excel button"],
            ["Upload loan documents", "Loans > View Loan > Documents tab"],
            ["Change your password", "Contact your administrator"],
        ],
        [65, 125]
    )

    pdf.sub_title("10.2 Keyboard and Interface Tips")
    pdf.bullet("Search fields - Type your search text and press Enter to apply the filter.")
    pdf.bullet("Table sorting - Click any column header to sort. Click again to reverse the order.")
    pdf.bullet("Page size - Use the dropdown at the bottom of tables to show 10, 20, 50, or 100 rows.")
    pdf.bullet("Close popups - Press the Escape key on your keyboard, or click outside the popup area.")
    pdf.bullet("Date pickers - Click the calendar icon to open a date selector. You can also type the date directly.")
    pdf.bullet("Sidebar - Click the collapse arrows to minimize the sidebar for more screen space.")

    pdf.sub_title("10.3 Accepted File Types")
    pdf.simple_table(
        ["Feature", "What Files You Can Use"],
        [
            ["Collection Import", ".docx (Word) and .csv (spreadsheet) files"],
            ["Document Upload", "Most file types: images, PDFs, Word, Excel"],
            ["Group Chat Attachments", "Images and documents, up to 15 MB each"],
            ["Message Attachments", "Most file types: images, PDFs, documents"],
            ["Profile Photo", "Image files: JPG, PNG, GIF"],
        ],
        [55, 135]
    )

    pdf.sub_title("10.4 Getting Help")
    pdf.body_text("If you encounter any issues or have questions:")
    pdf.bullet("Check the notification bell for any system announcements about known issues or scheduled maintenance.")
    pdf.bullet("Contact your system administrator or developer for technical issues.")
    pdf.bullet("If the system shows a Maintenance page, the system is being updated. Please wait and try again later.")
    pdf.bullet("If you forgot your password, use the Forgot Password link on the Login page.")
    pdf.bullet("If your account is locked or you cannot log in, contact your administrator to check your account status.")

    # ─── OUTPUT ───
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "RACATOM-LMIS_User_Manual.pdf")
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_manual()
