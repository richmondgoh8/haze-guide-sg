export function requireElement(root, selector) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Dashboard markup is missing: ${selector}`);
  return element;
}

export function getElements(root, selectors) {
  return Object.fromEntries(
    Object.entries(selectors).map(([key, selector]) => [key, requireElement(root, selector)]),
  );
}
