import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import {
  bumpPlexLibraryIndexCacheGeneration,
  getPlexUser,
  getPlexServers,
} from "@/lib/plex";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { generateToken } from "@/lib/utils";
import {
  isPublicSignupAllowed,
  validateAndConsumeInvite,
  type PrismaTransaction,
} from "@/lib/signup-invites";

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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
    Credentials({
      id: "plex",
      name: "Plex",
      credentials: {
        plexToken: { label: "Plex Token", type: "text" },
        inviteToken: { label: "Invite", type: "text" },
      },
      async authorize(credentials) {
        const plexToken = credentials?.plexToken as string | undefined;
        if (!plexToken) return null;

        const inviteToken = credentials?.inviteToken as string | undefined;

        const plexUser = await getPlexUser(plexToken).catch(() => null);
        if (!plexUser) return null;

        const email = plexUser.email?.toLowerCase();
        if (!email) return null;

        const servers = await getPlexServers(plexToken).catch(() => []);
        const firstServer = servers[0];

        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
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

          bumpPlexLibraryIndexCacheGeneration(user.id);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl,
          };
        }

        const publicSignup = isPublicSignupAllowed();
        const userCount = await prisma.user.count();
        const bootstrap = !publicSignup && userCount === 0;
        const needInvite = !publicSignup && !bootstrap;

        if (needInvite && !inviteToken?.trim()) {
          return null;
        }

        const plexCreate = {
          email,
          name: plexUser.username,
          avatarUrl: plexUser.thumb ?? null,
          passwordHash: randomBytes(32).toString("hex"),
          watchlistRadarrToken: generateToken(24),
        };

        try {
          if (publicSignup || bootstrap) {
            user = await prisma.$transaction(async (tx) => {
              const u = await tx.user.create({ data: plexCreate });
              await tx.plexConnection.create({
                data: {
                  userId: u.id,
                  plexToken,
                  plexClientId: "screened",
                  plexUsername: plexUser.username,
                  plexServerId: firstServer?.machineIdentifier ?? null,
                },
              });
              return u;
            });
          } else {
            user = await prisma.$transaction(async (tx) => {
              const v = await validateAndConsumeInvite(
                tx as PrismaTransaction,
                inviteToken,
              );
              if (!v.ok) {
                throw new Error("PLEX_INVITE_INVALID");
              }
              const u = await tx.user.create({ data: plexCreate });
              await tx.plexConnection.create({
                data: {
                  userId: u.id,
                  plexToken,
                  plexClientId: "screened",
                  plexUsername: plexUser.username,
                  plexServerId: firstServer?.machineIdentifier ?? null,
                },
              });
              return u;
            });
          }
        } catch (e) {
          if (e instanceof Error && e.message === "PLEX_INVITE_INVALID") {
            return null;
          }
          throw e;
        }

        bumpPlexLibraryIndexCacheGeneration(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (trigger === "update" && session?.user) {
        if (session.user.name !== undefined) token.name = session.user.name;
        if (session.user.email !== undefined) token.email = session.user.email;
        if (session.user.image !== undefined)
          token.picture = session.user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (token.name !== undefined) {
        session.user.name = token.name as string;
      }
      if (token.email !== undefined) {
        session.user.email = token.email as string;
      }
      if (token.picture !== undefined) {
        session.user.image = token.picture as string;
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
