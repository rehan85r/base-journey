// Base Mainnet only. Keep the provider key in Vercel environment variables.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const {address, action = 'txlist', page = '1'} = req.query;
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address) ||
      !['txlist','tokentx','tokennfttx'].includes(action) || !/^[1-9][0-9]{0,3}$/.test(String(page))) {
    return res.status(400).json({error:'Invalid history request.'});
  }
  if (!process.env.BLOCKSCOUT_API_KEY) return res.status(503).json({error:'Wallet history is not configured. Add BLOCKSCOUT_API_KEY in Vercel and redeploy.'});
  const url = new URL('https://api.blockscout.com/8453/api');
  for (const [key,value] of Object.entries({module:'account',action,address,page,offset:'1000',sort:'asc',startblock:'0',endblock:'999999999',apikey:process.env.BLOCKSCOUT_API_KEY})) url.searchParams.set(key,value);
  try {
    const response = await fetch(url, {signal:AbortSignal.timeout(25000)});
    if (!response.ok) throw new Error('Provider unavailable');
    const data = await response.json();
    if (!Array.isArray(data.result)) {
      if (/no transactions found/i.test(String(data.message))) return res.status(200).json({result:[],hasMore:false});
      throw new Error('Provider rejected request');
    }
    res.status(200).json({result:data.result,hasMore:data.result.length === 1000});
  } catch (error) {
    console.error('Base history request failed:', error.name);
    res.status(502).json({error:'Base history provider could not load data. Check your API key/plan or try again later.'});
  }
};
