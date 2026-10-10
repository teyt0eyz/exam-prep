/**
 * Choice order for one question: order[displayPosition] = original index.
 * Call from an event handler (not during render) so server and client markup match.
 */
export function makeChoiceOrder(random: () => number = Math.random): number[] {
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order;
}

/** Where the original answer index ended up on screen. */
export function remapAnswer(order: readonly number[], answer: number): number {
  return order.indexOf(answer);
}
