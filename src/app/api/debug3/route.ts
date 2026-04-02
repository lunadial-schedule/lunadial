import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic"

export async function GET() {
  const key = process.env.ENCRYPTION_KEY || "";
  
  // Return the char codes to see exactly what characters are in it
  const charCodes = [];
  for (let i = 0; i < key.length; i++) {
    charCodes.push(key.charCodeAt(i));
  }
  
  return NextResponse.json({
    key,
    length: key.length,
    charCodes
  })
}
