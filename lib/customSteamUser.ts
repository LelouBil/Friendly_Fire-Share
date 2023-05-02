import SteamUser from "steam-user";
import SteamID from "steamid";
import {prisma} from "./db";
import {EResult} from "steam-session";
import {Buffer} from "buffer/";
import {check_machine_id} from "./check_machine_id";
import {randomInt} from "crypto";

export enum SteamUserErrors {
    MachineIdInvalid,
    RefreshTokenInvalid,
    OtherError
}

type CachedSteamUser = {
    steam_id: string;
    user: SteamUser,
    lastUse: Date,
    useCount: number,



}

type ReleaseMethod = () => void;

class CacheManager {
    private Cache = new Map<string, CachedSteamUser>()

    constructor() {
        const cache_check_hours: number = process.env.USER_CACHE_CHECK_HOURS === undefined ? 10 : parseInt(process.env.USER_CACHE_CHECK_HOURS);
        const max_cache_hours: number = process.env.USER_CACHE_MAX_CACHE_HOURS === undefined ? 24 : parseInt(process.env.USER_CACHE_MAX_CACHE_HOURS);
        setInterval(() => {
            this.Cache.forEach(
                (v, k) => {
                    console.info(`Cache: user ${v.steam_id}, use : ${v.useCount}, last: ${v.lastUse}`);
                    if (v.useCount > 0) {
                        return;
                    }
                    const number = (new Date().getTime() - v.lastUse.getTime()) / (1000 * 60 * 60);
                    if (number > max_cache_hours ) {
                        SteamUserCacheManager.Cache.delete(k);
                        v.user.logOff();
                        console.info(`Logged off user ${v.steam_id}`);
                    }
                }

            )
        }, 60 * 60 * cache_check_hours * 1000);
    }

    public get(steam_id: string): [SteamUser | undefined, ReleaseMethod] {
        const val = this.Cache.get(steam_id);
        if (val == undefined) return [val, () => {
        }];
        val.useCount++;
        return [val.user, () => this.decrement(val)]
    }

    public set(steam_id: string, user: SteamUser): [SteamUser, ReleaseMethod] {
        if (this.Cache.has(steam_id)) {
            console.warn(`Caching user that is already cached : ${steam_id}`);
        }
        const userData = {
            user,
            steam_id: steam_id,
            useCount: 1,
            lastUse: new Date(),
        };
        this.Cache.set(steam_id, userData);
        return [userData.user, () => this.decrement(userData)]
    }

    private decrement(user: CachedSteamUser) {
        user.useCount--;
        user.lastUse = new Date();
        if(user.useCount == 0 && (this.Cache.get(user.steam_id) !== user)){
            user.user.logOff();
        }
    }

    public has(steam_id: string): boolean {
        return this.Cache.has(steam_id);
    }

    public invalidate(steam_id: string){
        if (!this.Cache.has(steam_id)) {
            console.info(`Invalidating uncached user ${steam_id}`);
            return;
        }
        this.Cache.get(steam_id)?.user.logOff();
        this.Cache.delete(steam_id);
    }
}

const globalWithCache = global as unknown as { cacheManager: CacheManager };

const SteamUserCacheManager: CacheManager =
    globalWithCache.cacheManager || new CacheManager();

if (process.env.NODE_ENV !== 'production') {
    globalWithCache.cacheManager = SteamUserCacheManager
}

export default async function withSteamUser<T>(refresh_token: string, steam_id: string, machine_id: string | null, handler: (user: SteamUser) => Promise<T>): Promise<T> {
    const [user, logOff] = await createSteamUser(refresh_token, steam_id, machine_id);
    const data = await handler(user);
    logOff();
    return data;
}

async function createSteamUser(refresh_token: string, steam_id: string, machine_id: string | null): Promise<[SteamUser, ReleaseMethod]> {
    let user = new SteamUser();
    const steamId = new SteamID(steam_id);
    user.storage.on('save', function (filename, contents, callback) {
        callback(null);
    });

    user.storage.on('read', function (filename, callback) {
        callback(null, undefined);
    });

    const machineId = machine_id == null ? null : Buffer.from(machine_id, "hex");
    if (machineId !== null) {
        if (!check_machine_id(machineId)) {
            await prisma.user.update({
                where: {
                    id: steam_id
                },
                data: {
                    MachineId: null
                }
            })
            await invalidateSteamUser(steam_id);
            throw SteamUserErrors.MachineIdInvalid;
        }
    }


    if (SteamUserCacheManager.has(steam_id)) {
        console.info(`Using cached steam user ${steam_id}`)
        return SteamUserCacheManager.get(steam_id) as [SteamUser, ReleaseMethod];
    }

    return new Promise<[SteamUser, ReleaseMethod]>((resolve, reject) => {
        user.on("loggedOn", async () => {
            console.log("logged in, checking steamId");
            if (steamId.toString() !== user.steamID?.toString()) {
                await removeToken(steam_id);
                reject(SteamUserErrors.RefreshTokenInvalid);
            } else {
                console.info(`Caching user ${steam_id}`)
                resolve(SteamUserCacheManager.set(steam_id, user));
            }
        });
        user.on("error", async (args) => {
            await removeToken(steam_id);
            console.error(args);
            if (args.eresult === EResult.AccessDenied || args.eresult === EResult.Expired) {
                await removeToken(steam_id);
                reject(SteamUserErrors.RefreshTokenInvalid);
            } else {
                reject(SteamUserErrors.OtherError);
            }

        });
        let details = {
            refreshToken: refresh_token,
            machineName: "Friendly Fire-Share",
            logonID: randomInt(100, 999),
            steamID: steamId
        };
        // @ts-ignore
        user._getMachineID = () => {
            console.log("using machineId");
            return machineId;
        };
        user.logOn(details);
        // @ts-ignore

        console.log("Logging in");
    });
}

async function removeToken(steam_id: string) {
    console.log(`Removing refresh token of user ${steam_id}`);
    await prisma.user.update({
        where: {
            id: steam_id
        },
        data: {
            RefreshToken: null
        }
    });
    await invalidateSteamUser(steam_id)
}

export async function invalidateSteamUser(steam_id: string) {
    console.info(`Invalidated user of ${steam_id}`)
    SteamUserCacheManager.invalidate(steam_id);
}