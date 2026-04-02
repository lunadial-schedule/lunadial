require("dotenv").config({ path: ".env.local" });

async function testRefresh() {
  const refreshToken = "-Ysv9eYf0fjXX-RXbg1PtuBRAh8vG4meV-K1htxDxmc7IR1zOw";
  const clientId = process.env.CHZZK_CLIENT_ID;
  const clientSecret = process.env.CHZZK_CLIENT_SECRET;
  
  const tokenUrl = "https://openapi.chzzk.naver.com/auth/v1/token";
  
  const body = JSON.stringify({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  });

  const text = await response.text();
  console.log("Status:", response.status);
  console.log("Response:", text);
}
testRefresh();
