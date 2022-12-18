import SteamUser from "steam-user";
import SteamID from "steamid";

// TODO https://github.com/DoctorMcKay/node-steam-user/issues/415
export default async function createSteamUser(refresh_token: string, steam_id: string) {
    let user = new SteamUser();
    const steamId = new SteamID(steam_id);
    user.storage.on('save', function (filename, contents, callback) {
        callback(null);
    });

    user.storage.on('read', function (filename, callback) {
        callback(null, undefined);
    });

    //todo ask machine_id in param

    return new Promise<SteamUser>((resolve, reject) => {
        user.on("loggedOn", (args) => {
            console.log("logged in, checking steamId");
            if (steamId.toString() !== user.steamID?.toString()) {
                reject("SteamID doesn't match");
            } else resolve(user);
        })
        user.on("error", (args) => {
            console.error(args);
            reject(args);

        })
        let details = {refreshToken: refresh_token, machineName: "Friendly Fire-Share"};
        user.logOn(details);

        console.log("Logging in")
    })
}