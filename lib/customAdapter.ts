import {User} from "@prisma/client";
import type {Adapter, AdapterSession, AdapterUser} from "next-auth/adapters";
import {prisma} from "./db";

function prismUserToAdapterUser(user: User): AdapterUser {
    return {
        id: user.id,
        name: "",
        steam_id: user.id,
        refresh_token: user.RefreshToken,
        sentry_file: user.SentryFile,
        email: "",
        emailVerified: new Date()
    };
}

export default function MyAdapter(): Adapter {
    return {
        async createUser(user): Promise<AdapterUser> {
            return prisma.user
                .create({
                    data: {
                        id: user.steam_id,
                        RefreshToken: null,
                        SentryFile: null
                    }
                }).then(prismUserToAdapterUser);
        },
        async getUser(id) {
            return prisma.user.findUnique({
                where: {
                    id: id
                }
            }).then(u => u == null ? null : prismUserToAdapterUser(u));
        },
        async getUserByEmail(email) {
            console.log("getUserByEmail");
            return null;
        },
        async getUserByAccount({providerAccountId, provider}) {
            return prisma.user.findUnique({
                where: {
                    id: providerAccountId
                }
            }).then(u => u == null ? null : prismUserToAdapterUser(u));
        },
        async updateUser(user) {
            return prisma.user.update({
                data: user,
                where: {
                    id: user.id
                }
            }).then(prismUserToAdapterUser);
        },
        async deleteUser(userId): Promise<void> {
            return prisma.user.delete({
                where: {
                    id: userId
                }
            }).then();
        },
        async linkAccount(account) {
            console.log("linkAccount");
            return;
        },
        async unlinkAccount({providerAccountId, provider}) {
            console.log("unlinkAccount");
            return;
        },
        async createSession({sessionToken, userId, expires}) {
            return {} as AdapterSession;
        },
        async getSessionAndUser(sessionToken) {
            return {} as ReturnType<typeof this.getSessionAndUser>;
        },
        async updateSession({sessionToken}) {
            return {} as AdapterSession;
        },
        async deleteSession(sessionToken) {
            return;
        },
        async createVerificationToken({identifier, expires, token}) {
            return null;
        },
        async useVerificationToken({identifier, token}) {
            return null;
        }
    };
}