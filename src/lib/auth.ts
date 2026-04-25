import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { getPlexUser, getPlexServers } from "@/lib/plex";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
      },
    }),
    Credentials({
      id: "plex",
      name: "Plex",
      credentials: {
        plexToken: { label: "Plex Token", type: "text" },
      },
      async authorize(credentials) {
        const plexToken = credentials?.plexToken as string | undefined;
        if (!plexToken) return null;

        const plexUser = await getPlexUser(plexToken).catch(() => null);
        if (!plexUser) return null;

        const email = plexUser.email?.toLowerCase();
        if (!email) return null;

        const servers = await getPlexServers(plexToken).catch(() => []);
        const firstServer = servers[0];

        // Find existing user or create one
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: plexUser.username,
              avatarUrl: plexUser.thumb ?? null,
              // Random password — Plex users never use password login
              passwordHash: randomBytes(32).toString("hex"),
            },
          });
        }

        // Upsert Plex connection
        await prisma.plexConnection.upsert({
          where: { userId: user.id },
          update: {
            plexToken,
            plexUsername: plexUser.username,
            plexServerId: firstServer?.machineIdentifier ?? null,
          },
          create: {
            userId: user.id,
            plexToken,
            plexClientId: "screened",
            plexUsername: plexUser.username,
            plexServerId: firstServer?.machineIdentifier ?? null,
          },
        });

        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
