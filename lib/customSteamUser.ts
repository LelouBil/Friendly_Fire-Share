import SteamUser from "steam-user";

export default async function createSteamUser(refresh_token: string) {
    let user = new SteamUser();
    user.storage.on('save', function (filename, contents, callback) {
        callback(null);
    });

    user.storage.on('read', function (filename, callback) {
        callback(null,undefined);
    });
    //todo ask sentry file in param;
    return new Promise<SteamUser>((resolve, reject) => {
        user.on("loggedOn",(args) => {
            console.log("logged in");
            resolve(user);
        })
        user.on("error", (args)=> {
            console.error(args);
            reject(args);

        })
    user.logOn({refreshToken: refresh_token, machineName: "Friendly Fire-Share"});

        console.log("Logging in")
    })
}