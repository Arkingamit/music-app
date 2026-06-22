/**
 * Stop words for English and Romanized Hindi commonly found in worship songs.
 * These words will be ignored during keyword extraction.
 */
const STOP_WORDS = new Set([
  // English common words
  'the', 'and', 'to', 'a', 'of', 'in', 'is', 'i', 'that', 'it', 'for', 'you', 'my', 'on', 'with', 'we', 'are', 'this', 'be', 'your', 'as', 'will', 'not', 'have', 'all', 'me', 'from', 'he', 'by', 'but', 'so', 'our', 'what', 'can', 'us', 'when', 'how', 'who', 'they', 'them', 'their', 'was', 'were', 'been', 'there', 'has', 'do', 'don', 'out', 'up', 'down', 'oh', 'ah', 'yeah', 'no', 'yes', 'am', 'too', 'very', 'just', 'like',
  
  // Hindi romanized common words
  'hai', 'ki', 'ke', 'ka', 'ko', 'aur', 'se', 'me', 'mein', 'tu', 'teri', 'tera', 'mere', 'mera', 'meri', 'hum', 'jo', 'wo', 'yeh', 'kya', 'kaha', 'kahan', 'nahi', 'hi', 'bhi', 'ab', 'jab', 'tab', 'liye', 'kuch', 'sab', 'koi', 'tha', 'thi', 'the', 'diya', 'kiya', 'hui', 'hua', 'karo', 'kare', 'kar', 'ho', 'gaya', 'gayi', 'gaye', 'apni', 'apna', 'apne', 'bhi', 'na'
]);

/**
 * Extracts the most common meaningful words from a text string (lyrics).
 * Returns the top `limit` words ranked from most frequent to least frequent.
 * 
 * @param text The text to analyze (e.g., song lyrics)
 * @param limit The maximum number of keywords to return (default 15)
 * @returns Array of lowercase keyword strings
 */
export function generateKeywords(text: string | undefined | null, limit: number = 15): string[] {
  if (!text) return [];

  // Remove punctuation, special characters, and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' '); // Supports Hindi unicode block too

  // Split into words
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);

  // Count word frequencies
  const frequencies = new Map<string, number>();
  
  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }
  }

  // Sort by frequency descending
  const sortedWords = Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Return top N keywords
  return sortedWords.slice(0, limit);
}
