import {NextApiRequest, NextApiResponse} from "next";
import {EAuthTokenPlatformType, LoginSession} from "steam-session";
import {AllowedConfirmation, StartAuthSessionWithQrResponse} from "steam-session/dist/interfaces-internal";
import {getApiServerSession} from "@/lib/customSession";
import {prisma} from "@/lib/db";
import * as Sentry from "@sentry/nextjs";

export type RefreshTokenData = {
    clientId: string;
    requestId: string; //buffer in original
    pollInterval: number;
    challengeUrl: string;
    version: number;
    allowedConfirmations: AllowedConfirmation[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getApiServerSession(req, res);
    Sentry.setUser({
        id: session.user.steam_id,
        username: session.user.name
    })

    const server_user = await prisma.user
        .findUniqueOrThrow({
            where: {
                id: session.user.steam_id
            }
        });

    let refresh_token_data: RefreshTokenData | null = null;
    if (server_user.RefreshToken == null) {

        const loginSession = new LoginSession(EAuthTokenPlatformType.SteamClient);
        loginSession._doPoll = async () => {
        };
        await loginSession.startWithQR();
        const qr_data = loginSession._startSessionResponse as StartAuthSessionWithQrResponse;
        refresh_token_data = {
            ...qr_data,
            allowedConfirmations: [],
            requestId: qr_data.requestId.toString("base64")
        };
        return res.status(200).send(refresh_token_data)
    }else{
        return res.status(400).send("Refresh token déja valide")
    }
}