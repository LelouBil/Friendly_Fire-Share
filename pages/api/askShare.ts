import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "../../lib/customSession";
import {prisma} from "../../lib/db";
import createSteamUser, {SteamUserErrors} from "../../lib/customSteamUser";
import {mockSession} from "next-auth/client/__tests__/helpers/mocks";
import {getDeviceName} from "./getDeviceName";

export default async function handler(req : NextApiRequest,res: NextApiResponse) {
    const session = await getApiServerSession(req,res);

    if(req.body.lender === undefined || typeof(req.body.lender) !== "string"){
        return res.status(400).send("Missing lender property");
    }

    const lender = req.body.lender;

    const userWithLender = await prisma.user.findUnique({
        where:{
            id: session.user.steam_id
        },
        select:{
            BorrowsFrom: {
                where:{
                    id: lender
                },
                select:{
                    id: true,
                    RefreshToken: true
                }
            },
            id: true,
            MachineId: true
        }
    }).catch(() => null);


    if(userWithLender === null){
        return res.status(403).send(`You are not allowed to borrow from ${lender}`);
    }


    function machineIdError() {
        return res.status(400).send(`You don't have a valid machineId`);
    }

    if(userWithLender.MachineId === null){
        return machineIdError();
    }

    function refreshTokenError() {
        return res.status(400).send(`${lender} did not log in with qr code or it has expired`);
    }

    if(userWithLender.BorrowsFrom[0].RefreshToken === null){
        return refreshTokenError();
    }

    const refreshToken = userWithLender.BorrowsFrom[0].RefreshToken;


    try {
        let steamUser = await createSteamUser(refreshToken, lender,userWithLender.MachineId);
        //todo people check
        await steamUser.addAuthorizedBorrowers(userWithLender.id)
        var newVar = await steamUser.getAuthorizedSharingDevices();
        let authorization: string;
        let found = newVar.devices.find(d => d.deviceName === getDeviceName(userWithLender.id))?.deviceToken;
        if(!found)
            authorization = (await steamUser.authorizeLocalSharingDevice(getDeviceName(userWithLender.id))).deviceToken
        else
            authorization = found;
        await steamUser.logOff()
        return res.status(200).send(authorization);
    } catch (e) {
        console.error(e);
        if(e === SteamUserErrors.RefreshTokenInvalid){
            return refreshTokenError();
        }else if(e === SteamUserErrors.MachineIdInvalid){
            return machineIdError();
        }else{
            return res.status(500).send("Server error");
        }
    }



}