import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { db } from "@/lib/db"
import { sign } from "jsonwebtoken"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return new NextResponse("Missing email or password", { status: 400 })
    }

    const user = await db.user.findUnique({
      where: {
        email: email,
      },
    })

    if (!user) {
      return new NextResponse("Incorrect email or password", { status: 400 })
    }

    const validPassword = await bcrypt.compare(password, user.hashedPassword)

    if (!validPassword) {
      return new NextResponse("Incorrect email or password", { status: 400 })
    }

    // Generate session ID
    const sessionId = sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: "30d",
    })

    // After creating the session, make sure to set the cookie properly:
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profile_image_url,
      },
      sessionToken: sessionId, // Include session token in response
    })

    // Set multiple cookie variations to ensure compatibility
    response.cookies.set("session", sessionId, {
      httpOnly: false, // Allow JavaScript access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    response.cookies.set("auth-session", sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    response.cookies.set("user-session", sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.log("[LOGIN_POST]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
