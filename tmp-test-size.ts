import { CHZZK_CLIENT_ID, CHZZK_CLIENT_SECRET, CHZZK_OPENAPI_BASE_URL } from '@/config/env'

async function test() {
  const url = new URL(`${CHZZK_OPENAPI_BASE_URL}/open/v1/lives`)
  url.searchParams.append('size', '50')
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Client-Id': CHZZK_CLIENT_ID,
      'Client-Secret': CHZZK_CLIENT_SECRET,
      'Content-Type': 'application/json',
    },
  })

  const json = await response.json()
  console.log(`[Page 0] Status: ${json.code}, Data Length: ${json.content?.data?.length}`)
}

test().catch(console.error);
