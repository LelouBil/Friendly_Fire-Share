import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "@/lib/customSession";
import {prisma} from "@/lib/db";
import withSteamUser, {SteamUserErrors} from "@/lib/customSteamUser";
import {getDeviceName} from "./getDeviceName";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getApiServerSession(req, res);

  if (req.body.lender === undefined || typeof (req.body.lender) !== "string") {
    return res.status(400).send("Missing lender property");
  }

  const lender = req.body.lender;

  const userWithLender = await prisma.user.findUnique({
    where: {
      id: session.user.steam_id
    },
    select: {
      BorrowsFrom: {
        where: {
          id: lender
        },
        select: {
          id: true,
          RefreshToken: true
        }
      },
      id: true,
      MachineId: true
    }
  });


  if (userWithLender === null) {
    return res.status(403).send(`You are not allowed to borrow from ${lender}`);
  }


  function machineIdError() {
    return res.status(400).send(`You don't have a valid machineId`);
  }

  if (userWithLender.MachineId === null) {
    return machineIdError();
  }

  function refreshTokenError() {
    return res.status(400).send(`${lender} did not log in with qr code or it has expired`);
  }

  if (userWithLender.BorrowsFrom[0].RefreshToken === null) {
    return refreshTokenError();
  }

  const refreshToken = userWithLender.BorrowsFrom[0].RefreshToken;


  try {
    return await withSteamUser(refreshToken, lender, userWithLender.MachineId,
      async (steamUser) => {
        console.log("ASKSHARE - Created steam user");
        const currentBorrowers = await steamUser.getAuthorizedBorrowers();
        if (currentBorrowers.borrowers.length >= 4) {
          console.info(`User ${steamUser.steamID} has max share, looking for remove`);
          let removeable: [string, number][] = [];

          const min_share_hours: number = process.env.REMOVE_OLD_MIN_SHARE_HOURS === undefined ? 24 : parseInt(process.env.REMOVE_OLD_MIN_SHARE_HOURS);
          const min_last_use_hours: number = process.env.REMOVE_OLD_MIN_LAST_USE_HOURS === undefined ? 24 : parseInt(process.env.REMOVE_OLD_MIN_LAST_USE_HOURS);


          const newVar = await steamUser.getAuthorizedSharingDevices();

          for (let borrower of currentBorrowers.borrowers) {
            console.log(`Looking ${borrower.steamid}`);
            const time_diff = (new Date().getTime() - borrower.timeCreated.getTime()) / (1000 * 60 * 60);
            console.log(`time diff: ${time_diff}`);
            if (time_diff < min_share_hours) {
              continue;
            }
            let device = newVar.devices.find(d => d.deviceName === getDeviceName(borrower.steamid.toString()));
            console.log(`device: ${JSON.stringify(device)}`);
            if (device === undefined || device.lastTimeUsed === null) {
              removeable.push([borrower.steamid.toString(), borrower.timeCreated.getTime()]);
              continue;
            }
            const last_use_diff = (new Date().getTime() - device.lastTimeUsed.getTime()) / (1000 * 60 * 60);
            console.log(`time diff: ${last_use_diff}`);
            if (last_use_diff > min_last_use_hours) {
              removeable.push([borrower.steamid.toString(), borrower.timeCreated.getTime()]);
            }
          }
          removeable.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
          console.log(removeable);
          if (process.env.REMOVE_OLD_ENABLED == "yes" && removeable.length > 0) {
            const removeSteamId = removeable[0][0];
            await steamUser.removeAuthorizedBorrowers([]);
            const deviceName = getDeviceName(removeSteamId);
            const devices = await steamUser.getAuthorizedSharingDevices();
            const filtered = devices.devices.filter(d => d.deviceName == deviceName);
            if (filtered.length == 0) {
              console.error(`Could not find device(${deviceName}) of user ${removeSteamId} while removing`);
            } else if (filtered.length > 1) {
              console.error(`Multiple devices(${deviceName}) matched for user ${removeSteamId} while removing`);
            } else {
              await steamUser.deauthorizeSharingDevice(filtered[0].deviceToken);
            }
          } else
            return res.status(409).send(`${lender} already has maximum people shared !`);
        }
        await steamUser.addAuthorizedBorrowers(userWithLender.id);
        console.log("ASKSHARE - Added user as authorized borrower");
        const newVar = await steamUser.getAuthorizedSharingDevices();
        let authorization: string;
        let found = newVar.devices.find(d => d.deviceName === getDeviceName(userWithLender.id))?.deviceToken;
        if (!found)
          authorization = (await steamUser.authorizeLocalSharingDevice(getDeviceName(userWithLender.id))).deviceToken;
        else
          authorization = found;

        res.status(200).send(authorization);
      });
  } catch (e) {
    console.error(e);
    if (e === SteamUserErrors.RefreshTokenInvalid) {
      return refreshTokenError();
    } else if (e === SteamUserErrors.MachineIdInvalid) {
      return machineIdError();
    } else {
      return res.status(500).send("Server error");
    }
  }

}