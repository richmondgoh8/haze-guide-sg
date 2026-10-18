/** Small, non-interactive hints that also work with touch and keyboard. */
export function bindTooltips(root) {
  const cleanups = Array.from(root.querySelectorAll('[data-tooltip]'), (container) => {
    const trigger = container.querySelector('button');
    const content = container.querySelector('[role="tooltip"]');
    const show = () => {
      content.hidden = false;
    };
    const hide = () => {
      content.hidden = true;
    };
    const enter = (event) => {
      if (event.pointerType === 'mouse') show();
    };
    const leave = () => {
      if (!trigger.matches(':focus-visible')) hide();
    };
    const focus = () => {
      if (trigger.matches(':focus-visible')) show();
    };
    const toggle = () => {
      content.hidden = !content.hidden;
    };
    const outside = (event) => {
      if (!container.contains(event.target)) hide();
    };
    const escape = (event) => {
      if (event.key === 'Escape') hide();
    };
    const listeners = [
      [container, 'pointerenter', enter],
      [container, 'pointerleave', leave],
      [trigger, 'focus', focus],
      [trigger, 'blur', hide],
      [trigger, 'click', toggle],
      [root, 'click', outside],
      [root, 'keydown', escape],
    ];
    for (const [target, type, listener] of listeners) target.addEventListener(type, listener);
    return () => {
      hide();
      for (const [target, type, listener] of listeners) target.removeEventListener(type, listener);
    };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}
