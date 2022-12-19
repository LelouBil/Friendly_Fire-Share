import styles from '@/styles/Me.module.css';
import Head from "next/head";
import React, {FormEventHandler, useEffect, useMemo, useState} from "react";
import {Button, Card, Checkbox, Image, Input, Loading, Table, Text} from "@nextui-org/react";
import {useSession} from "next-auth/react";
import {GetServerSidePropsContext, GetServerSidePropsResult} from "next";
import {Session} from "next-auth";
import {prisma} from "../lib/db";
import {getServerSession} from "../lib/customSession";
import {steam_web} from "../lib/steam_web";
import createSteamUser from "../lib/customSteamUser";
import {SteamPlayerSummary} from "steamwebapi-ts/lib/types/SteamPlayerSummary";
import axios from "axios";
import {EAuthSessionGuardType, EAuthTokenPlatformType, LoginSession} from "steam-session";
import {AllowedConfirmation, StartAuthSessionWithQrResponse} from "steam-session/dist/interfaces-internal";
import {useQRCode} from 'next-qrcode';
import {string} from "prop-types";
import {getDeviceName} from "./api/getDeviceName";


type ShareInfo = {
    computer: string | null,
    lastUse: string | null,
    enabled: boolean
}

type LendInfo = {
    steamId: string,
    name: string,
    enabled: boolean
    deviceId: string | null
}

type BorrowingUser = {
    name: string,
    avatar_url: string,
    profile_url: string,
}

type ShareArray = (ShareInfo & BorrowingUser)[]

export type RefreshTokenData = {
    clientId: string;
    requestId: string; //buffer in original
    pollInterval: number;
    challengeUrl: string;
    version: number;
    allowedConfirmations: AllowedConfirmation[];
}

type MeProps = { sharesProp: ShareArray, lendersProp: LendInfo[], machine_id_valid: boolean, refresh_token_data: RefreshTokenData | null, session: Session };

function MeCard(props: { session: Session }) {
    return <Card variant={"bordered"} style={{width: "fit-content"}}>
        <Card.Footer
            isBlurred
            css={{
                position: "absolute",
                bgBlur: "#ffffff66",
                borderTop: "$borderWeights$light solid rgba(255, 255, 255, 0.2)",
                bottom: 0,
                zIndex: 1,
                height: "20%",
                padding: "0"
            }}
        >
            <Text h4 style={{margin: "auto", paddingBottom: "4px"}}>
                {props.session.user.name}
            </Text>
        </Card.Footer>
        <Card.Body style={{padding: 0}}>
            <Card.Image
                src={props.session.user.profile_picture_url}
                objectFit="cover"
                width="200px"
                alt="Your Steam profile picture"
            />
        </Card.Body>
    </Card>;
}

function ShareTable({sharesProp}: { sharesProp: ShareArray }) {
    const [shares, setShares] = useState<ShareArray>(sharesProp);

    const toggleShare = (index: number) => {
        let newShares = [...shares];
        newShares[index].enabled = !newShares[index].enabled;
        setShares(newShares);
    };

    return (
        <Table className={styles.table} aria-label="Shares list">
            <Table.Header>
                <Table.Column>Name</Table.Column>
                <Table.Column>Computer</Table.Column>
                <Table.Column>Last use</Table.Column>
                <Table.Column>Enabled</Table.Column>
            </Table.Header>
            <Table.Body>
                {shares.map((share, index) => (
                    <Table.Row key={index}>
                        <Table.Cell>{share.name}</Table.Cell>
                        <Table.Cell>{share.computer}</Table.Cell>
                        <Table.Cell>{share.lastUse}</Table.Cell>
                        <Table.Cell>
                            <Checkbox aria-label="Control share state"
                                      isSelected={share.enabled}
                                      isRounded={false}
                                      onChange={() => toggleShare(index)}/>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
}

function SetNewMachineId({setValid}: { setValid: (valid: boolean) => void }) {

    const [machineId, setMachineId] = useState("");
    const submitMachineId: FormEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        let response = await axios.post("/api/machineId/set", {
            machine_id: machineId
        });

        //todo eliott
    };
    return (
        <form onSubmit={submitMachineId} className={styles.machineIdForm}>
            <Input id="machine_id" maxLength={310} minLength={310} placeholder={"Paste here"} size="lg" required
                   bordered onChange={e => {
                setMachineId(e.target.value)
            }}/>
            <Button type="submit">Submit</Button>
            <a href="/machineID.ps1">Get my machineID</a>
        </form>
    );
}

function SetRefreshToken({refreshTokenData, fulfilled}: { refreshTokenData: RefreshTokenData, fulfilled: () => void }) {


    const submitData = useMemo(() => async () => {
        await axios.post("/api/refreshToken/set", {refresh_token_data: refreshTokenData});
        fulfilled();
    }, []);

    const {Canvas} = useQRCode();

    return (
        <div>
            <Canvas
                text={refreshTokenData.challengeUrl}
                options={{
                    level: 'M',
                    margin: 3,
                    scale: 4,
                    width: 200,
                    color: {
                        dark: '#010599FF',
                        light: '#FFBF60FF',
                    },
                }}
            />
            <Button onClick={submitData}>J'ai scanné</Button>
        </div>
    );
}

export default function Me({sharesProp, machine_id_valid, lendersProp, refresh_token_data}: MeProps) {

    const {data: session} = useSession() as unknown as { data: Session };

    const [machineIdValid, setMachineIdValid] = useState(machine_id_valid);
    const [refreshTokenData, setRefreshTokenData] = useState(refresh_token_data);

    console.log(session);
    return (
        <div className={styles.container}>
            <Head>
                <title>Me - Friendly Fire-Share</title>
            </Head>

            <MeCard session={session}/>
            <main className={styles.main}>
                <Text h1>
                    {session.user.name}
                </Text>
                <div>
                    <Text h2>
                        Machine ID :
                    </Text>
                    {
                        machineIdValid ? "✔" : <SetNewMachineId setValid={setMachineIdValid}/>
                    }
                </div>
                <div>
                    <Text h2>
                        Refresh Token :
                    </Text>
                    {
                        refreshTokenData !== null ? <SetRefreshToken fulfilled={() => setRefreshTokenData(null)}
                                                                     refreshTokenData={refreshTokenData}/> : "✔"
                    }
                </div>
                <div className={styles.container}>
                    <ShareTable sharesProp={sharesProp}/>
                </div>
                <div className={styles.container}>
                    <LendTable lenders={lendersProp}/>
                </div>
            </main>
        </div>
    );
}

export function LendTable({lenders}: { lenders: LendInfo[] }) {

    const [lends,setLends] = useState(lenders);

    console.log("render lends");

    const getShare = useMemo(() => {
        return function (id: string) {
            axios.post("/api/askShare",{lender: id})
                .then(a => {
                    setLends(lends.map(l => {
                        if(l.steamId === id){
                            return {...l,deviceId: a.data as string}
                        } else return l
                    }));
                })
                .catch(e => {
                    setLends(lends.map(l => {
                        if(l.steamId === id){
                            return {...l,enabled: false}
                        }else return l
                    }));
                    console.error(e);
                })
        }
    }, [lenders]);

    return (
        <Table className={styles.table} aria-label="Lenders list">
            <Table.Header>
                <Table.Column>Name</Table.Column>
                <Table.Column>Get share</Table.Column>
            </Table.Header>
            <Table.Body>
                {lenders.map(lend => (
                    <Table.Row key={lend.steamId}>
                        <Table.Cell>{lend.name}</Table.Cell>
                        <Table.Cell>
                            {lend.deviceId ? <Text>
                                    {lend.deviceId}
                                </Text>
                                :
                                <Button disabled={!lend.enabled}
                                        onClick={() => getShare(lend.steamId)}
                                >Get Share</Button>
                            }
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    )
}

export async function getServerSideProps(context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<MeProps>> {

    let session = await getServerSession(context);


    let server_user = await prisma.user.findUniqueOrThrow({
        where: {
            id: session.user.steam_id
        },
        include: {
            Borrowers: true,
            BorrowsFrom: true
        }
    });


    let devices: { [steam_id: string]: any } = {};

    if (server_user.RefreshToken != null) {
        try {
            console.log(session.user.steam_id);
            let steam_client = await createSteamUser(server_user.RefreshToken, session.user.steam_id, null);
            console.log("Steam client logged in");
            let the_devices = (await steam_client.getAuthorizedSharingDevices()).devices;
            devices = the_devices.reduce((obj, item) => {

                    if (item?.lastBorrower) {
                        return {...obj, [item.lastBorrower.getSteamID64()]: item};
                    } else
                        return obj;
                }
                , {});
            steam_client.logOff();
        } catch (error) {
            server_user.RefreshToken = null;
        }
    }

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
            requestId: qr_data.requestId.toString("base64"),
        };
    }

    let machine_id_valid = server_user.MachineId != null;


    // list.reduce((obj, item) => ({...obj, [item.name]: item.value}), {})

    let steam_profiles: SteamPlayerSummary[] = server_user.Borrowers.length > 0 ?
        (await steam_web.getPlayersSummary(server_user.Borrowers.map(b => b.id))) : [];

    const shares: ShareArray = steam_profiles.map(profile => {
        let steam_id = profile.steamid;
        let user_info: BorrowingUser = {
            name: profile.personaname,
            avatar_url: profile.avatarfull,
            profile_url: profile.profileurl
        };

        let share_info: ShareInfo;
        if (devices[steam_id]) {
            let device = devices[steam_id];
            share_info = {
                lastUse: device.lastTimeUsed,
                computer: device.deviceName,
                enabled: device.isCanceled
            };
        } else {
            share_info = {
                lastUse: null,
                computer: null,
                enabled: false
            };
        }
        return {...user_info, ...share_info};
    });

    let lenders: LendInfo[] = [];

    if(machine_id_valid) {

        const lenderNames: { [k: string]: string } = server_user.BorrowsFrom.length > 0 ?
            (await steam_web.getPlayersSummary(server_user.BorrowsFrom.map(b => b.id)))
                .reduce((acc, elem) => ({...acc, [elem.steamid]: elem.personaname}), {}) : {};


        const lendedMap : { [k: string]: string | null} = await server_user.BorrowsFrom.reduce(async (accum,bf) => {
            if (bf.RefreshToken !== null) {
                const usr = await createSteamUser(bf.RefreshToken,bf.id,null);
                let authorizedSharingDevices = await usr.getAuthorizedSharingDevices();
                const finded = authorizedSharingDevices.devices.find(d =>
                    d.deviceName === getDeviceName(server_user.id)
                );
                await usr.logOff();
                if(finded !== undefined){
                    return {...accum, [bf.id]: finded.deviceToken}
                }else return {...accum,[bf.id]: null};
            } else {
                return {...accum,[bf.id]: null};
            }
        },{})



        lenders = server_user.BorrowsFrom.map(bf => {
                return {
                    steamId: bf.id,
                    name: lenderNames[bf.id],
                    enabled: bf.RefreshToken != null,
                    deviceId: lendedMap[bf.id]
                }
            })
        ;
    }

    return {
        props: {
            sharesProp: shares,
            lendersProp: lenders,
            refresh_token_data,
            machine_id_valid,
            session: session
        }
    };
}