import SteamUser from "steam-user";
import SteamID from "steamid";
import {prisma} from "./db";
import {EResult} from "steam-session";
import {Buffer} from "buffer/";
import {check_machine_id} from "./check_machine_id";
import {randomInt} from "crypto";

// TODO https://github.com/DoctorMcKay/node-steam-user/issues/415


export enum SteamUserErrors {
    MachineIdInvalid,
    RefreshTokenInvalid,
    OtherError
}

export default async function createSteamUser(refresh_token: string, steam_id: string, machine_id: string | null) {
    let user = new SteamUser();
    const steamId = new SteamID(steam_id);
    user.storage.on('save', function (filename, contents, callback) {
        callback(null);
    });

    user.storage.on('read', function (filename, callback) {
        callback(null, undefined);
    });

    const machineId = machine_id == null ? null: Buffer.from(machine_id, "hex");
    if (machineId !== null) {
        if (!check_machine_id(machineId)) {
            //todo remove machine id
            throw SteamUserErrors.MachineIdInvalid;
        }
    }


    return new Promise<SteamUser>((resolve, reject) => {
        user.on("loggedOn", async (args) => {
            console.log("logged in, checking steamId");
            if (steamId.toString() !== user.steamID?.toString()) {
                await removeToken(steam_id);
                reject(SteamUserErrors.RefreshTokenInvalid);
            } else resolve(user);
        })
        user.on("error", async (args) => {
            await removeToken(steam_id);
            console.error(args);
            if (args.eresult === EResult.AccessDenied || args.eresult === EResult.Expired) {
                await removeToken(steam_id);
                reject(SteamUserErrors.RefreshTokenInvalid);
            } else {
                reject(SteamUserErrors.OtherError);
            }

        })
        let details = {refreshToken: refresh_token, machineName: "Friendly Fire-Share",logonID: randomInt(100,999)}; //todo random logonId
        // @ts-ignore
        user._getMachineID = () => {
            console.log("using machineId")
            return machineId;
        }
        user.logOn(details);
        // @ts-ignore

        console.log("Logging in")
    })
}

async function removeToken(steam_id: string) {
    await prisma.user.update({
        where: {
            id: steam_id
        },
        data: {
            RefreshToken: null
        }
    });
}