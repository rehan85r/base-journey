// Base Mainnet only. Keep the provider key in Vercel environment variables.
const PRO_URL = 'https://api.blockscout.com/8453/api';      // needs BLOCKSCOUT_API_KEY (PRO plan)
const PUBLIC_URL = 'https://base.blockscout.com/api';        // free, no key, rate limited

async function callProvider(base, params, useKey) {
  const url = new URL(base);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (useKey) url.searchParams.set('apikey', process.env.BLOCKSCOUT_API_KEY);
  const response = await fetch(url, {signal: AbortSignal.timeout(25000), headers: {accept: 'application/json'}});
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!response.ok) {
    return {ok: false, detail: `HTTP ${response.status}${data && (data.message || data.error) ? ': ' + (data.message || data.error) : ''}`};
  }
  if (!data) return {ok: false, detail: 'Provider returned non-JSON response'};
  if (Array.isArray(data.result)) return {ok: true, result: data.result};
  if (/no (transactions|token transfers|nft transfers|records) found/i.test(String(data.message))) return {ok: true, result: []};
  // Etherscan-style error: message "NOTOK", result is a string like "Invalid API Key"
  return {ok: false, detail: [data.message, typeof data.result === 'string' ? data.result : ''].filter(Boolean).join(' - ') || 'Provider rejected request'};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  const {address, action = 'txlist', page = '1'} = req.query;
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address) ||
      !['txlist', 'tokentx', 'tokennfttx'].includes(action) || !/^[1-9][0-9]{0,3}$/.test(String(page))) {
    return res.status(400).json({error: 'Invalid history request.'});
  }
  const params = {module: 'account', action, address, page, offset: '1000', sort: 'asc', startblock: '0', endblock: '999999999'};
  const attempts = [];
  if (process.env.BLOCKSCOUT_API_KEY) attempts.push({name: 'blockscout-pro', base: PRO_URL, useKey: true});
  attempts.push({name: 'blockscout-public', base: PUBLIC_URL, useKey: false});

  const failures = [];
  for (const attempt of attempts) {
    try {
      const out = await callProvider(attempt.base, params, attempt.useKey);
      if (out.ok) {
        return res.status(200).json({result: out.result, hasMore: out.result.length === 1000, source: attempt.name});
      }
      failures.push(`${attempt.name}: ${out.detail}`);
    } catch (error) {
      failures.push(`${attempt.name}: ${error.name}`);
    }
  }
  // Never includes the API key; only provider status/message text.
  console.error('Base history request failed:', failures.join(' | '));
  res.status(502).json({
    error: 'Base history provider could not load data. Check your API key/plan or try again later.',
    detail: failures.join(' | ')
  });
};
