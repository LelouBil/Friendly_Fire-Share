import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "@/lib/customSession";
import {prisma} from "@/lib/db";
import {StartAuthSessionWithQrResponse} from "steam-session/dist/interfaces-internal";
import {EAuthSessionGuardType, EAuthTokenPlatformType, LoginSession} from "steam-session";
import {invalidateSteamUser} from "@/lib/customSteamUser";
import {RefreshTokenData} from "@/pages/api/refreshToken/getData";
import * as Sentry from "@sentry/nextjs";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getApiServerSession(req, res);
  Sentry.setUser({
    id: session.user.steam_id,
    username: session.user.name
  })
  if (!req.body.refresh_token_data || typeof req.body.refresh_token_data !== "object") {
    return res.status(400).send("Bad request, missing refresh_token_data");
  }

  const refresh_data = req.body.refresh_token_data as RefreshTokenData;
  const qr_data: StartAuthSessionWithQrResponse = {
    ...refresh_data,
    allowedConfirmations: [{type: EAuthSessionGuardType.DeviceConfirmation, message: undefined}],
    requestId: Buffer.from(refresh_data.requestId, 'base64')
  };

  const steam_session = new LoginSession(EAuthTokenPlatformType.SteamClient);
  steam_session._startSessionResponse = qr_data;


  await new Promise<void>(async (resolve, reject) => {
    steam_session.on("authenticated", async () => {
      if (steam_session.steamID.toString() !== session.user.steam_id) {
        reject("Wrong steamID !");
      } else {
        resolve();
      }
    });
    steam_session.on("error", e => {
      reject(e);
    });
    await steam_session._doPoll();
  });

  await prisma.user.update({
    where: {
      id: session.user.steam_id
    },
    data: {
      RefreshToken: steam_session.refreshToken
    }
  });
  await invalidateSteamUser(session.user.steam_id);


  console.log(`Updated refresh_token of user ${session.user.name}`);
  return res.status(200).send("Success");
}