// Wrapper around Date.now() used by "time ago" formatters (timeAgo helpers)
// spread across the app. Kept in its own module so the impure read happens
// in exactly one place instead of being called directly inside component
// render bodies (which the React Compiler's purity check flags).
export function now() {
  return Date.now()
}
