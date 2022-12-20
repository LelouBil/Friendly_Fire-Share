import {SteamPlayerSummary} from "steamwebapi-ts/lib/types/SteamPlayerSummary";
import {steam_web} from "./steam_web";
import {User} from "@prisma/client";
import createSteamUser from "./customSteamUser";

export async function getSharesOfUser(server_user: User & {Borrowers: User[]}) {


    let devices: { [steam_id: string]: any } = {};

    if (server_user.RefreshToken != null) {
        try {
            console.log(server_user.id);
            let steam_client = await createSteamUser(server_user.RefreshToken, server_user.id, null);
            console.log("Steam client logged in");
            let the_devices = (await steam_client.getAuthorizedSharingDevices()).devices;
            devices = the_devices.reduce((obj, item) => {

                    if (item?.lastBorrower) {
                        return {...obj, [item.lastBorrower.getSteamID64()]: item};
                    } else
                        return obj;
                }
                , {});
            steam_client.logOff();
        } catch (error) {
            server_user.RefreshToken = null;
        }
    }


    let steam_profiles: SteamPlayerSummary[] = server_user.Borrowers.length > 0 ?
        (await steam_web.getPlayersSummary(server_user.Borrowers.map(b => b.id))) : [];

    const shares: ShareArray = steam_profiles.map(profile => {
        let steam_id = profile.steamid;
        let user_info: BorrowingUser = {
            steam_id: profile.steamid,
            name: profile.personaname,
            avatar_url: profile.avatarfull,
            profile_url: profile.profileurl
        };

        let share_info: ShareInfo;
        if (devices[steam_id]) {
            let device = devices[steam_id];
            share_info = {
                lastUse: device.lastTimeUsed,
                computer: device.deviceName,
                in_use: true
            };
        } else {
            share_info = {
                lastUse: null,
                computer: null,
                in_use: false
            };
        }
        return {...user_info, ...share_info};
    });
    return shares;
}

export type BorrowingUser = {
    name: string,
    steam_id: string,
    avatar_url: string,
    profile_url: string,
}
export type ShareInfo = {
    computer: string | null,
    lastUse: string | null,
    in_use: boolean
}
export type ShareArray = (ShareInfo & BorrowingUser)[]