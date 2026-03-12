interface ChzzkTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

interface ChzzkProfileResponse {
  channelId: string
  channelName: string
}

export async function authorizeChzzkToken(code: string, state: string): Promise<ChzzkTokenResponse> {
  const clientId = process.env.CHZZK_CLIENT_ID
  const clientSecret = process.env.CHZZK_CLIENT_SECRET
  const redirectUri = process.env.CHZZK_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Chzzk environment variables")
  }

  const tokenUrl = "https://openapi.chzzk.naver.com/auth/v1/token"
  
  const body = JSON.stringify({
    grantType: "authorization_code",
    clientId,
    clientSecret,
    code,
    state
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  })

  const responseText = await response.text()

  if (!response.ok) {
    console.error("Chzzk token exchange failed. Status:", response.status)
    console.error("Chzzk token exchange body sent:", body.toString())
    console.error("Chzzk token exchange response text:", responseText)
    throw new Error(`Failed to exchange token (${response.status}): ${responseText}`)
  }

  const data = JSON.parse(responseText)
  return {
    accessToken: data.content.accessToken,
    refreshToken: data.content.refreshToken,
    expiresIn: data.content.expiresIn,
    tokenType: data.content.tokenType
  }
}

export async function getChzzkProfile(accessToken: string): Promise<ChzzkProfileResponse> {
  const profileUrl = "https://openapi.chzzk.naver.com/open/v1/users/me"

  const response = await fetch(profileUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error("Chzzk profile fetch failed:", errText)
    throw new Error(`Failed to fetch profile: ${response.status}`)
  }

  const data = await response.json()
  return {
    channelId: data.content.channelId,
    channelName: data.content.channelName
  }
}

export async function revokeChzzkToken(accessToken: string): Promise<void> {
  const clientId = process.env.CHZZK_CLIENT_ID
  const clientSecret = process.env.CHZZK_CLIENT_SECRET
  
  if (!clientId || !clientSecret) return

  const revokeUrl = "https://openapi.chzzk.naver.com/auth/v1/token/revoke"
  const body = new URLSearchParams()
  body.append("clientId", clientId)
  body.append("clientSecret", clientSecret)
  body.append("accessToken", accessToken)

  try {
    const res = await fetch(revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    })
    
    if (!res.ok) {
      console.error("Failed to revoke token, status:", res.status)
    }
  } catch (error) {
    console.error("Error revoking chzzk token:", error)
  }
}
