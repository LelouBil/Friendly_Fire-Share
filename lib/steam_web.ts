import {Steam} from "steamwebapi-ts";

const globalForSteam = global as unknown as { steam_web: Steam };

export const steam_web = (
  globalForSteam.steam_web ||
  new Steam(process.env.STEAM_WEB_API_KEY)
);

if (process.env.NODE_ENV !== 'production') globalForSteam.steam_web = steam_web;