/**
 * Browser-side HTTP client for 3G TMS Rating API.
 * Uses fetch() directly from the browser.
 */

/**
 * Posts XML to the 3G TMS Rating API.
 * @returns {Promise<string>} Raw XML response string.
 */
export async function postToG3(xmlBody, credentials) {
  const { baseURL, username, password } = credentials;

  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const url = `${baseURL}/web/services/rating/findRates?username=${encodedUsername}&password=${encodedPassword}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xmlBody,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 500)}`);
    }

    return await res.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 30s');
    }
    // CORS error shows as TypeError: Failed to fetch
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      throw new Error(
        'Network error — this may be a CORS issue. ' +
        'The 3G TMS server must allow cross-origin requests from this page. ' +
        'Contact your 3G admin to whitelist this origin, or use a CORS proxy.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Apply carrier margin to compute customer price.
 */
export function applyMargin(totalCharge, scac, margins) {
  if (!margins || margins.length === 0) return { customerPrice: totalCharge, marginType: 'none', marginValue: 0 };

  const match = margins.find(m => m.scac.toUpperCase() === (scac || '').toUpperCase());
  if (!match) return { customerPrice: totalCharge, marginType: 'none', marginValue: 0 };

  if (match.type === '%') {
    return {
      customerPrice: totalCharge * (1 + match.value / 100),
      marginType: '%',
      marginValue: match.value,
    };
  }
  return {
    customerPrice: totalCharge + match.value,
    marginType: 'Flat $',
    marginValue: match.value,
  };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
