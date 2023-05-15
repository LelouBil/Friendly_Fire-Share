import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "@/lib/customSession";
import withSteamUser, {SteamUserErrors} from "@/lib/customSteamUser";
import {prisma} from "@/lib/db";
import {getDeviceName} from "../getDeviceName";
import * as Sentry from "@sentry/nextjs";


export type RemoveBorrowerBody = {
    borrower_steam_id: string,
    remove_from_database: boolean
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiServerSession(req, res);
    Sentry.setUser({
        id: session.user.steam_id,
        username: session.user.name
    })

    if (!req.body || typeof req.body !== "object") {
        return res.status(400).send("Missing body data");
    }


    const remove_data: RemoveBorrowerBody = req.body;


    const dbUser = await prisma.user
        .findUniqueOrThrow({
            where: {
                id: session.user.steam_id
            }
        });

    if (dbUser.RefreshToken === null) {
        return res.status(400).send("Refresh token missing");
    }

    try {
        await withSteamUser(dbUser.RefreshToken, dbUser.id, null,
            async (user) => {
                const foundShare = (await user.getAuthorizedSharingDevices()).devices
                    .find(d => d.deviceName === getDeviceName(remove_data.borrower_steam_id));
                if (foundShare) {
                    await user.deauthorizeSharingDevice(foundShare.deviceToken);
                }
                await user.removeAuthorizedBorrowers([remove_data.borrower_steam_id]);
            });

        if (remove_data.remove_from_database) {
            await prisma.user
                .update({
                    where: {
                        id: session.user.steam_id
                    },
                    data: {
                        Borrowers: {
                            disconnect: {
                                id: remove_data.borrower_steam_id
                            }
                        }
                    }
                });
        }
        return res.status(200).send("Deauthorized");
    } catch (e) {
        if (e === SteamUserErrors.RefreshTokenInvalid) {
            return res.status(400).send("Refresh token invalid");
        }
    }

}