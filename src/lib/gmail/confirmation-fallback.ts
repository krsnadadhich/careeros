export interface ConfirmationFallback {
  company: string | null;
  role: string | null;
}

/** Deterministic fallback for pulling company/role out of well-known,
 * highly consistent ATS confirmation-email templates — a complement to
 * the LLM extraction, never a replacement. Real data showed the local
 * model return `null` for company on an email whose literal first body
 * line IS the company name ("Pavago\n\nYour application for the AI
 * Engineer job was submitted successfully.") — for these specific,
 * observed-across-multiple-real-companies templates, a plain string
 * parse is both more reliable and free. Callers should only use a field
 * from here to fill in what the LLM left as a placeholder, never to
 * override a real LLM value. */
export function extractConfirmationFallback(subject: string, bodyText: string): ConfirmationFallback {
  // LinkedIn "Your application was sent to X" template — subject carries
  // the company; body echoes "Your application was sent to X" on its
  // first line, then the role on the next.
  const sentToMatch = subject.match(/application was sent to (.+?)(?:\s*\(|$)/i);
  if (sentToMatch) {
    const company = sentToMatch[1].trim();
    const lines = bodyText.split("\n").map((l) => l.trim()).filter(Boolean);
    const role = lines[1] && lines[1].length < 120 ? lines[1] : null;
    return { company, role };
  }

  // Workable-style "Thanks for applying to X" template — body's first
  // line is the company name, followed by "Your application for the
  // {role} job was submitted successfully."
  const thanksMatch = subject.match(/thanks? for applying to (.+?)[!.]?\s*$/i);
  if (thanksMatch) {
    const company = thanksMatch[1].trim();
    const roleMatch = bodyText.match(/application for (?:the )?(.+?) job was submitted/i);
    return { company, role: roleMatch ? roleMatch[1].trim() : null };
  }

  return { company: null, role: null };
}
