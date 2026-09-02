export function isRelevantForM2(): boolean {
  const securityForms = document.querySelectorAll(
    'input[type=password], input[name*=card], input[autocomplete=cc-number], form input[type=email]'
  );
  return securityForms.length > 0;
}
