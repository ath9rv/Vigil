export function isRelevantForM2(): boolean {
  const securityForms = document.querySelectorAll(
    'input[type=password], input[name*=card], input[autocomplete=cc-number], input[name*=cvv]'
  );
  return securityForms.length > 0;
}
