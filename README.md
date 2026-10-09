# Base Journey

## Enable real wallet history

1. Create a Base-compatible API key at https://dev.blockscout.com/ and check that your selected plan supports Base.
2. In Vercel Project Settings → Environment Variables, add `BLOCKSCOUT_API_KEY` for Production (and Preview if required). Never paste the key into index.html or commit it.
3. Upload these changes to the GitHub repository and redeploy.
4. Test a known active wallet and an unused address. Provider errors must show an error, never demo results.

`api/history.js` uses Blockscout's Etherscan-compatible Base Mainnet endpoint, paginated in batches of 1,000. No partial totals are displayed if the 100-page safety limit is reached. The key remains server-side.

## Metric scope

Cards measure normal on-chain transactions involving the address, including failed transactions in transaction/activity counts. ETH volume sums successful native ETH values in these transactions (incoming and outgoing); it is not USD volume, trading volume, token volume, or internal-transfer volume. Smart Contracts counts unique destinations of successful transactions with input data, a heuristic rather than verified contract classification. Wallet Age is time since first normal transaction. Day/month/year grouping uses UTC; weeks use fixed seven-day epoch buckets. Token/NFT endpoints are fetched for the existing auxiliary counters, but their logs are not added to transaction totals (to avoid double counting).

Live provider access and deployment cannot be verified without a configured API key.
