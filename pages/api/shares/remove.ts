import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "../../../lib/customSession";
import createSteamUser, {SteamUserErrors} from "../../../lib/customSteamUser";
import {prisma} from "../../../lib/db";
import {getDeviceName} from "../getDeviceName";
import {log} from "util";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
    const session = await getApiServerSession(req,res);


    if(!req.body.borrower || typeof req.body.borrower !== "string"){
        return res.status(400).send("Missing property borrower");
    }


    const borrower = req.body.borrower;

    await prisma.user
        .update({
            where:{
                id: session.user.steam_id
            },
            data:{
                Borrowers:{
                    disconnect:{
                        id: borrower
                    }
                }
            }
        })

    const dbUser = await prisma.user
        .findUniqueOrThrow({
            where:{
                id: session.user.steam_id
            }
        })

    if(dbUser.RefreshToken === null){
        return res.status(400).send("Refresh token missing");
    }

    try {
        const login = await createSteamUser(dbUser.RefreshToken,dbUser.id,null);
        const foundShare = (await login.getAuthorizedSharingDevices()).devices
            .find(d => d.deviceName === getDeviceName(borrower));
        if(foundShare){
            await login.deauthorizeSharingDevice(foundShare.deviceToken);
        }

        return res.status(200).send("Deauthorized")
    }
    catch (e){
        if(e === SteamUserErrors.RefreshTokenInvalid){
            return res.status(400).send("Refresh token invalid");
        }
    }

}