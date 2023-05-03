import {Buffer} from "buffer/";

export function check_machine_id(machineId: Buffer) {

    // return false;
    var start = machineId.byteLength === 155 || machineId.byteLength === 109
            && machineId[0x0] === 0
            && machineId.slice(0x1, 0xe).toString("ascii") === "MessageObject"
            && machineId[0xe] === 0
            && machineId[0xf] === 1
            && machineId.slice(0x10, 0x13).toString("ascii") === "BB3"
            && machineId[0x13] === 0
            //BB3 - 40 octets
            && machineId[0x3c] === 0
            && machineId[0x3d] === 1
            && machineId.slice(0x3e, 0x41).toString("ascii") === "FF2"
        //FF2 - 40 octets
    ;
    if (machineId.byteLength === 155) {
        return start
            && machineId[0x6A] === 0
            && machineId[0x6B] === 1
            && machineId.slice(0x6C, 0x6f).toString("ascii") === "3B3"
            && machineId[0x98] === 0
            && machineId[0x99] === 8
            && machineId[0x9A] === 8

    } else {
        return start
            && machineId[0x6A] === 0
            && machineId[0x6B] === 8
            && machineId[0x6C] === 8
    }
}