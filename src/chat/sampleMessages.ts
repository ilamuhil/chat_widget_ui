import type { Role } from '../helpers'

type ChatMessage = {
  role: Role
  content: string
  contentType: string
  timestamp: string
  agentName?: string
}

export const sampleMessages: Array<ChatMessage> = [
  { role: 'user', content: 'Hey! I need help with my account.', contentType: 'text', timestamp: '2025-01-01 12:00:00' },
  { role: 'user', content: 'I can’t log in since yesterday.', contentType: 'text', timestamp: '2025-01-01 12:00:10' },
  {
    role: 'user',
    content:
      'Details:\n- It says “invalid credentials” even though I reset my password.\n- I tried Chrome + Edge.\n- I also cleared cookies.\n\nAny idea what else to try?',
    contentType: 'text',
    timestamp: '2025-01-01 12:00:20',
  },
  {
    role: 'assistant',
    content:
      'Thanks for the details. A couple quick checks:\n1) Are you using email or username?\n2) Do you have 2FA enabled?\n3) Are you seeing any lockout message after multiple attempts?\n\nIf you can share the exact error text, I can narrow this down.',
    contentType: 'text',
    timestamp: '2025-01-01 12:01:00',
  },
  { role: 'user', content: 'Using email. 2FA is enabled. No lockout message.', contentType: 'text', timestamp: '2025-01-01 12:01:20' },
  {
    role: 'agent',
    agentName: 'John Doe',
    content:
      'Got it — I’m going to help you troubleshoot. First, please confirm:\n- The email you’re using (mask it like a***@domain.com)\n- Whether you recently changed your phone number (2FA)\n\nAlso, please avoid sending passwords here.',
    contentType: 'text',
    timestamp: '2025-01-01 12:02:00',
  },
  { role: 'user', content: 'Email is a***@example.com. I changed my phone number last week.', contentType: 'text', timestamp: '2025-01-01 12:02:25' },
  {
    role: 'agent',
    agentName: 'John Doe',
    content:
      'That explains it. Your 2FA is likely still tied to the old number.\n\nWe can update it after identity verification. I’ll send a verification link to your email. Please open it and follow the steps. If you don’t see it in 2 minutes, check spam/junk.',
    contentType: 'text',
    timestamp: '2025-01-01 12:03:00',
  },
  { role: 'assistant', content: 'While you do that, here’s a tip: keep this chat open so we can continue once verified.', contentType: 'text', timestamp: '2025-01-01 12:03:10' },
  {
    role: 'user',
    content:
      'I opened the link. It asks me to verify my identity by answering security questions. The questions are pretty old and I’m not sure I remember them exactly. Is there an alternative verification method? Also, the page loads slowly and sometimes the button becomes unresponsive.',
    contentType: 'text',
    timestamp: '2025-01-01 12:03:40',
  },
  {
    role: 'agent',
    agentName: 'John Doe',
    content:
      'Yes — if you don’t remember the security answers, you can choose the “Try another way” option. Depending on your account settings, we can verify via email OTP or support PIN. If the page is slow, try:\n- Refresh once\n- Disable browser extensions\n- Use an incognito/private window\n\nLet me know what options you see.',
    contentType: 'text',
    timestamp: '2025-01-01 12:04:10',
  },
  { role: 'user', content: 'I see email OTP and “support PIN”. I don’t have the PIN.', contentType: 'text', timestamp: '2025-01-01 12:04:35' },
  {
    role: 'agent',
    agentName: 'John Doe',
    content:
      'No problem — choose email OTP. Once you enter the OTP, you’ll be prompted to set your new 2FA phone number. After that, log out and log back in to confirm it’s fixed.',
    contentType: 'text',
    timestamp: '2025-01-01 12:05:00',
  },
  { role: 'user', content: 'OTP received.', contentType: 'text', timestamp: '2025-01-01 12:05:20' },
  { role: 'user', content: 'Entered it successfully.', contentType: 'text', timestamp: '2025-01-01 12:05:25' },
  { role: 'user', content: 'Now it asks for the new phone number. Doing that now.', contentType: 'text', timestamp: '2025-01-01 12:05:30' },
  {
    role: 'assistant',
    content:
      'Great.\n\nWhen entering the new number:\n- Make sure the country code is correct\n- Don’t include spaces or dashes\n- If you’re traveling, use the number you can reliably receive SMS on',
    contentType: 'text',
    timestamp: '2025-01-01 12:05:50',
  },
  {
    role: 'user',
    content:
      'Edge case test: superlongtoken=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    contentType: 'text',
    timestamp: '2025-01-01 12:06:10',
  },
  {
    role: 'agent',
    agentName: 'John Doe',
    content:
      'If you hit an error, screenshot it and upload it here. Also, if you’re curious, our status page is: https://status.example.com/incidents/12345 (just for reference).',
    contentType: 'text',
    timestamp: '2025-01-01 12:06:40',
  },
  { role: 'user', content: 'Updated the phone number and confirmed via SMS.', contentType: 'text', timestamp: '2025-01-01 12:07:00' },
  { role: 'assistant', content: 'Awesome — please try logging out and back in now.', contentType: 'text', timestamp: '2025-01-01 12:07:10' },
  {
    role: 'user',
    content:
      'It works now! Before we close, I have a small UI request: can the chat bubble remember its open state across page refresh? Not urgent, just asking.',
    contentType: 'text',
    timestamp: '2025-01-01 12:07:35',
  },
  {
    role: 'agent',
    agentName: 'John Doe',
    content:
      'Glad it’s working. For remembering open state, you’d typically store a flag in localStorage (e.g., chatOpen=true) and rehydrate it on load. Just be careful on mobile because you may want to default to closed.',
    contentType: 'text',
    timestamp: '2025-01-01 12:08:00',
  },
  {
    role: 'assistant',
    content:
      'Anything else I can help with?\n\n(Testing UI: This is another intentionally long message to check wrapping and spacing. The goal is to ensure alignment, tails, and padding remain consistent when the text spans multiple lines across different viewport sizes.)',
    contentType: 'text',
    timestamp: '2025-01-01 12:08:20',
  },
]


