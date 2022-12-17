import {NextApiRequest, NextApiResponse} from "next";
import {getApiServerSession} from "../../../lib/customSession";
import {prisma} from "../../../lib/db";

type setMachineIdInput = {
    machine_id: string
}

export default async function handler(req : NextApiRequest,res: NextApiResponse){
    const session = await getApiServerSession(req,res);
    //todo verification valide

    if(!req.body.machine_id || typeof req.body.machine_id !== "string"){
        return res.status(400).send("Bad request, missing machine_id");
    }


    prisma.user.update({
        where:{
            id: session.user.steam_id
        },
        data:{
            MachineId: req.body.machine_id
        }
    })
    return res.status(200);
}

export async function  setMachineId(machine_id: string){
    //todo
}