
/**
 * Utility to get the base URL for API calls.
 * On mobile, we must use an absolute URL pointing to the live backend.
 * On web, we use relative paths.
 */
export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Default to empty string for relative paths in web/development
  return "";
};

/**
 * Prepends the base URL to an API path.
 */
export const getFullUrl = (path: string) => {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return path;
  
  // Ensure we don't have double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBaseUrl}${cleanPath}`;
};
