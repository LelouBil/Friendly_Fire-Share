import {Steam} from "steamwebapi-ts";
import * as process from "process";
import { PHASE_PRODUCTION_BUILD } from 'next/constants';


const globalForSteam = global as unknown as { steam_web: Steam };

let api_key = process.env.STEAM_WEB_API_KEY
if(process.env.NEXT_PHASE == PHASE_PRODUCTION_BUILD){
  api_key = "invalid_token"
}
export const steam_web = (
  globalForSteam.steam_web ||
  new Steam(api_key)
);



if (process.env.NODE_ENV !== 'production') globalForSteam.steam_web = steam_web;