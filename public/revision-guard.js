/**
 * A generation counter prevents an earlier asynchronous response from replacing
 * a newer user decision. No remote evidence or test data is generated here.
 */
export function createRevisionGuard() {
  let revision = 0;
  return {
    current() { return revision; },
    invalidate() { revision += 1; return revision; },
    isCurrent(captured) { return captured === revision; }
  };
}
