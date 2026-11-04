import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./lib/prisma";
import bcrypt from "bcryptjs";

const DEFAULT_SESSION_MAX_AGE_HOURS = 6;

/**
 * Hard limit for a login session – after this the user must sign in again, regardless of activity.
 * Configurable via SESSION_MAX_AGE_HOURS (fractions allowed, e.g. 0.5 = 30 minutes), defaults to 6 hours.
 */
function resolveSessionMaxAgeSeconds(): number {
    const raw = process.env.SESSION_MAX_AGE_HOURS?.trim();
    if (!raw) return DEFAULT_SESSION_MAX_AGE_HOURS * 60 * 60;
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours <= 0) {
        console.warn(`[auth] Invalid SESSION_MAX_AGE_HOURS="${raw}", falling back to ${DEFAULT_SESSION_MAX_AGE_HOURS}h.`);
        return DEFAULT_SESSION_MAX_AGE_HOURS * 60 * 60;
    }
    return Math.round(hours * 60 * 60);
}

const SESSION_MAX_AGE_SECONDS = resolveSessionMaxAgeSeconds();

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                nickname: { label: "Nickname", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.nickname || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { nickname: credentials.nickname as string },
                });

                if (!user || !user.password) return null;

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isPasswordValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLoginPage = nextUrl.pathname.startsWith("/login");

            if (isOnLoginPage) {
                if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
                return true;
            }

            return isLoggedIn;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.loginAt = Math.floor(Date.now() / 1000);
            }
            // Absolute expiry: NextAuth's maxAge slides on activity, so enforce the limit from login time.
            // Tokens without loginAt (issued before this check existed) are invalidated too.
            const now = Math.floor(Date.now() / 1000);
            const loginAt = token.loginAt as number | undefined;
            if (!loginAt || now - loginAt > SESSION_MAX_AGE_SECONDS) {
                return null;
            }
            if (trigger === "update" && session?.role) {
                token.role = session.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "ADMIN" | "USER";
            }
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: SESSION_MAX_AGE_SECONDS,
    }
});
