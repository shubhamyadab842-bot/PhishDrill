/* =====================================================
   emails.js – all the practice emails for the simulator
   -----------------------------------------------------
   Each email is an object with these fields:
     from   – display name of the sender
     addr   – the real sender address (this is where the clues are)
     subj   – subject line
     body   – email text ("\n" = new line)
     link   – text of the link in the email ("" if there is none)
     href   – where that link REALLY goes (shown on hover)
     phish  – true = phishing, false = safe
     why    – 3 short reasons shown after the player answers
   To add a new email, copy one object and edit it.
   ===================================================== */

const EMAILS = [
  {
    from: "CloudDocs Billing",
    addr: "billing@clouddocs-mail.com",
    subj: "Your monthly invoice is ready",
    body: "Hello, your invoice for November is ready to view in your account.\n",
    link: "View invoice",
    href: "http://clouddocs-mail.com/inv/2231",
    phish: true,
    why: [
      "The tone is calm, but the sender’s domain isn’t the service’s own (clouddocs.com).",
      "The link goes to that same lookalike domain.",
      "Not every phishing email is urgent. Check the address every time."
    ]
  },
  {
    from: "Dr. Sharma (HOD)",
    addr: "hod.sharma.office@gmail.com",
    subj: "Quick favour",
    body: "Are you free? I need 3 gift cards for a seminar today. I’ll pay you back. I’m in a meeting, so reply only by email.",
    link: "",
    href: "",
    phish: true,
    why: [
      "A staff member using a free Gmail address is a warning sign.",
      "Gift card requests are a classic scam.",
      "“I can’t talk, just do it” stops you from checking with them."
    ]
  },
  {
    from: "Aarav (friend)",
    addr: "aarav.k8821@mail-clips.xyz",
    subj: "Is this you in this video?!",
    body: "OMG I can’t believe someone posted this of you. Watch before it gets deleted.\n",
    link: "Watch video",
    href: "http://vid-share-clip.xyz/v?u=1",
    phish: true,
    why: [
      "A friend writing from a strange address may have been hacked.",
      "Curiosity and panic are being used to make you click.",
      "The link goes to an unknown “.xyz” site."
    ]
  },
  {
    from: "MyBank Alerts",
    addr: "kyc@mybank-secure-verify.co",
    subj: "KYC incomplete: account freezes today",
    body: "Your KYC update is pending. Your account will be frozen today unless you enter your card number and PIN.\n",
    link: "Update KYC now",
    href: "http://mybank-secure-verify.co/kyc",
    phish: true,
    why: [
      "A bank’s real domain wouldn’t include “secure-verify”.",
      "“Frozen today” is a pressure tactic.",
      "Banks never ask for your PIN."
    ]
  },
  {
    from: "Scholarship Office",
    addr: "scholarships@college-aid-forms.net",
    subj: "Action needed: scholarship form",
    body: "Your scholarship is on hold. Download and fill in the attached form with your bank details and OTP today.\nAttachment: Scholarship_Form.pdf.exe",
    link: "",
    href: "",
    phish: true,
    why: [
      "The domain isn’t your college’s.",
      "“.pdf.exe” is a program pretending to be a PDF.",
      "Nobody legitimate asks for an OTP by email."
    ]
  },
  {
    from: "Global Careers",
    addr: "hr@global-careers-hiring.top",
    subj: "Offer letter: work from home, ₹40,000 a week",
    body: "Congratulations, you are selected! No interview needed. Pay a ₹1,500 registration fee to confirm your seat.\n",
    link: "Pay and register",
    href: "http://global-careers-hiring.top/pay",
    phish: true,
    why: [
      "You were “selected” for a job you never applied for.",
      "Real employers never charge you a fee to hire you.",
      "The offer is too good to be true and skips the interview."
    ]
  },
  {
    from: "Chatly Security",
    addr: "notify@chatly-security.net",
    subj: "New login from another country",
    body: "Someone logged in to your account from Moscow. If this wasn’t you, secure your account now.\n",
    link: "Secure my account",
    href: "http://chatly-security.net/reset",
    phish: true,
    why: [
      "Scary news is used to make you panic-click.",
      "The domain (chatly-security.net) isn’t the app’s real domain.",
      "Open the app yourself to check, don’t use the email’s link."
    ]
  },
  {
    from: "Shop Orders",
    addr: "no-reply@shop.example.com",
    subj: "Your order #48213 has shipped",
    body: "Good news, your order is on its way and should arrive Friday. You can track it any time in the app under Orders.\nNo action is needed.",
    link: "",
    href: "",
    phish: false,
    why: [
      "The sender domain matches the shop.",
      "It asks for nothing and points you to the app.",
      "There are no threats or deadlines."
    ]
  },
  {
    from: "Prof. Rao",
    addr: "rao@college.example.edu",
    subj: "Lab report due Friday",
    body: "Hi all, a reminder that lab report 3 is due this Friday at 5 PM. Please submit it on the course page as usual.\nThanks, Prof. Rao",
    link: "",
    href: "",
    phish: false,
    why: [
      "The address is on the college’s own domain.",
      "It refers to a process you already know.",
      "No links, attachments or secrets are requested."
    ]
  },
  {
    from: "Chatly",
    addr: "notify@chatly.example.com",
    subj: "Your password was changed",
    body: "Your Chatly password was changed just now. If this was you, no action is needed. If not, open the Chatly app and go to Settings > Security.\nMore help: ",
    link: "Help centre",
    href: "https://help.chatly.example.com/security",
    phish: false,
    why: [
      "The sender and the link are both on Chatly’s own domain.",
      "The main advice is to use the app, not a login link.",
      "It doesn’t ask for your password."
    ]
  },
  {
    from: "Academics Office",
    addr: "academics@college.example.edu",
    subj: "Course feedback survey",
    body: "Please share your feedback on this semester’s courses by 25 November. It takes about 5 minutes.\n",
    link: "Open survey",
    href: "https://portal.college.example.edu/survey",
    phish: false,
    why: [
      "The sender and the link are both on the college’s domain.",
      "The deadline is reasonable and there’s no threat.",
      "It asks for opinions, not passwords or money."
    ]
  },
  {
    from: "College Library",
    addr: "library@college.example.edu",
    subj: "Book due on Monday",
    body: "Your borrowed book “Intro to Algorithms” is due on Monday. You can renew it at the library desk.\nThank you.",
    link: "",
    href: "",
    phish: false,
    why: [
      "It comes from the college’s own domain.",
      "It names something you really borrowed.",
      "It sends you to the library desk, not to a link."
    ]
  },
  {
    from: "Coding Club",
    addr: "club@codingclub.example.org",
    subj: "This week at the coding club",
    body: "We’re building mini games on Thursday at 4 PM, room 204. Notes from last week: ",
    link: "Meeting notes",
    href: "https://codingclub.example.org/notes",
    phish: false,
    why: [
      "You joined this club, and the link matches its domain.",
      "It shares information and asks for nothing.",
      "The details (time, room) are specific and ordinary."
    ]
  },
  {
    from: "Careers Team",
    addr: "careers@company.example.com",
    subj: "We received your internship application",
    body: "Thanks for applying. Our team will review your application and reply within two weeks.\nNo action is needed from you.",
    link: "",
    href: "",
    phish: false,
    why: [
      "It confirms something you actually did.",
      "It asks for nothing and has no links.",
      "There’s no deadline or threat."
    ]
  },
  {
    from: "Campus IT Helpdesk",
    addr: "helpdesk@college.example.edu",
    subj: "Planned Wi‑Fi maintenance on Sunday",
    body: "The campus network will be down from 2 to 4 AM on Sunday for upgrades. Nothing is needed from you.\nQuestions? Visit the IT desk in the library.",
    link: "",
    href: "",
    phish: false,
    why: [
      "It comes from the official college domain.",
      "It’s informational and requests nothing.",
      "It directs questions to a physical office."
    ]
  }
];
